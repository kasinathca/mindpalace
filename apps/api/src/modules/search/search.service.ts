// ─────────────────────────────────────────────────────────────────────────────
// modules/search/search.service.ts — Full-text search via PostgreSQL tsvector
//
// Strategy: "search-then-fetch"
//   1. Run a raw SQL query that uses ts_rank to score and rank bookmark IDs
//   2. Use Prisma findMany to load the full bookmark rows (with tags included)
//   3. Re-sort the Prisma results back into rank order
//
// This keeps Prisma responsible for type-safe bookmark loading while letting
// PostgreSQL handle the expensive FTS ranking in a single index scan.
// ─────────────────────────────────────────────────────────────────────────────
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { BookmarkWithTags } from '../bookmarks/bookmarks.service.js';
import type { SearchQuery } from './search.schemas.js';

const BOOKMARK_INCLUDE = {
  tags: {
    include: { tag: { select: { id: true, name: true, color: true } } },
  },
} satisfies Prisma.BookmarkInclude;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchResult {
  bookmarks: BookmarkWithTags[];
  total: number;
  query: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Serialise a Prisma bookmark row (with nested tag join) to BookmarkWithTags */
function serialiseBookmark(bookmark: {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  coverImageUrl: string | null;
  notes: string | null;
  isPublic: boolean;
  isPinned: boolean;
  isFavourite: boolean;
  linkStatus: string;
  lastCheckedAt: Date | null;
  readAt: Date | null;
  userId: string;
  collectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
}): BookmarkWithTags {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    faviconUrl: bookmark.faviconUrl,
    coverImageUrl: bookmark.coverImageUrl,
    notes: bookmark.notes,
    isPublic: bookmark.isPublic,
    isPinned: bookmark.isPinned,
    isFavourite: bookmark.isFavourite,
    linkStatus: bookmark.linkStatus,
    lastCheckedAt: bookmark.lastCheckedAt?.toISOString() ?? null,
    readAt: bookmark.readAt?.toISOString() ?? null,
    userId: bookmark.userId,
    collectionId: bookmark.collectionId,
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
    tags: bookmark.tags.map(({ tag }) => tag),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Full-text search across a user's bookmarks.
 *
 * Uses PostgreSQL `websearch_to_tsquery` which handles phrases ("react hooks"),
 * boolean operators, and exclusions (-word) from free-text input.
 */
export async function searchBookmarks(userId: string, query: SearchQuery): Promise<SearchResult> {
  // `limit` is already coerced to a number by the Zod schema transform.
  const limit = query.limit;
  // Offset-based pagination for search is implemented in Phase 3 Sprint 7.
  // Full-text ranking makes cursor-based pagination non-trivial; OFFSET is
  // acceptable at the current dataset scale (<100 k bookmarks per user).
  const offset = 0;

  // Build optional extra conditions as Prisma.Sql fragments
  const extraConditions: Prisma.Sql[] = [];

  if (query.collectionId) {
    extraConditions.push(Prisma.sql`b."collectionId" = ${query.collectionId}`);
  }
  if (query.isPinned !== undefined) {
    extraConditions.push(Prisma.sql`b."isPinned" = ${query.isPinned}`);
  }
  if (query.isFavourite !== undefined) {
    extraConditions.push(Prisma.sql`b."isFavourite" = ${query.isFavourite}`);
  }
  if (query.linkStatus) {
    extraConditions.push(Prisma.sql`b."linkStatus" = ${query.linkStatus}::"LinkStatus"`);
  }
  if (query.tagIds && query.tagIds.length > 0) {
    // Bookmark must be tagged with ALL specified tagIds
    extraConditions.push(
      Prisma.sql`(
        SELECT COUNT(*) FROM bookmark_tags bt
        WHERE bt."bookmarkId" = b.id
          AND bt."tagId" = ANY(${query.tagIds}::text[])
      ) = ${query.tagIds.length}`,
    );
  }

  const extraWhere =
    extraConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(extraConditions, ' AND ')}`
      : Prisma.empty;

  // ── Step 1: Rank IDs via raw SQL ─────────────────────────────────────────
  type RankedRow = { id: string; rank: number };

  const rankedRows = await prisma.$queryRaw<RankedRow[]>`
    SELECT
      b.id,
      ts_rank(b."searchVector", websearch_to_tsquery('english', ${query.q})) AS rank
    FROM bookmarks b
    WHERE b."userId" = ${userId}
      AND b."searchVector" @@ websearch_to_tsquery('english', ${query.q})
      ${extraWhere}
    ORDER BY rank DESC, b."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Count separately for pagination metadata
  const countRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total
    FROM bookmarks b
    WHERE b."userId" = ${userId}
      AND b."searchVector" @@ websearch_to_tsquery('english', ${query.q})
      ${extraWhere}
  `;
  const total = Number(countRows[0]?.total ?? 0);

  if (rankedRows.length === 0) {
    return { bookmarks: [], total, query: query.q };
  }

  // ── Step 2: Fetch full data via Prisma ───────────────────────────────────
  const ids = rankedRows.map((r) => r.id);
  const bookmarks = await prisma.bookmark.findMany({
    where: { id: { in: ids } },
    include: BOOKMARK_INCLUDE,
  });

  // ── Step 3: Restore rank order ────────────────────────────────────────────
  const rankMap = new Map(rankedRows.map((r) => [r.id, r.rank]));
  bookmarks.sort((a, b) => (rankMap.get(b.id) ?? 0) - (rankMap.get(a.id) ?? 0));

  return {
    bookmarks: bookmarks.map(serialiseBookmark),
    total,
    query: query.q,
  };
}

// ── Duplicate / Similar detection ─────────────────────────────────────────────

export interface DuplicateGroup {
  url: string;
  bookmarks: BookmarkWithTags[];
}

/**
 * Find all URLs that the user has saved more than once.
 * Returns groups ordered by URL, each with the full bookmark rows sorted by
 * oldest first (so the user can see which one to keep).
 */
export async function findDuplicates(userId: string): Promise<DuplicateGroup[]> {
  type DupRow = { url: string; ids: string[] };

  const dupRows = await prisma.$queryRaw<DupRow[]>`
    SELECT url, array_agg(id ORDER BY "createdAt") AS ids
    FROM bookmarks
    WHERE "userId" = ${userId}
    GROUP BY url
    HAVING COUNT(*) > 1
    ORDER BY url
  `;

  if (dupRows.length === 0) return [];

  const allIds = dupRows.flatMap((r) => r.ids);
  const dbBookmarks = await prisma.bookmark.findMany({
    where: { id: { in: allIds } },
    include: BOOKMARK_INCLUDE,
  });

  const bookmarkMap = new Map(dbBookmarks.map((b) => [b.id, serialiseBookmark(b)]));

  return dupRows.map((row) => ({
    url: row.url,
    bookmarks: row.ids
      .map((id) => bookmarkMap.get(id))
      .filter((b): b is BookmarkWithTags => b !== undefined),
  }));
}

/**
 * Find the user's bookmarks whose URL matches `url` after stripping the query
 * string and fragment (i.e., same scheme + host + path).
 *
 * Useful for detecting "soft duplicates" before a new bookmark is saved.
 */
export async function findSimilar(userId: string, url: string): Promise<BookmarkWithTags[]> {
  // Strip query string and fragment so https://example.com/page?ref=123 and
  // https://example.com/page both match.
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM bookmarks
    WHERE "userId" = ${userId}
      AND regexp_replace(url, '[?#].*$', '') = regexp_replace(${url}, '[?#].*$', '')
    ORDER BY "createdAt" DESC
  `;

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const dbBookmarks = await prisma.bookmark.findMany({
    where: { id: { in: ids } },
    include: BOOKMARK_INCLUDE,
  });

  const rankMap = new Map(ids.map((id, i) => [id, i]));
  dbBookmarks.sort((a, b) => (rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0));

  return dbBookmarks.map(serialiseBookmark);
}
