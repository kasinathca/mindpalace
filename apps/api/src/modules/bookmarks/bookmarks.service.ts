// ─────────────────────────────────────────────────────────────────────────────
// modules/bookmarks/bookmarks.service.ts — Bookmark business logic
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.middleware.js';
import { HTTP } from '../../config/constants.js';
import { metadataQueue, archiveQueue, linkHealthQueue } from '../../workers/queues.js';
import type {
  CreateBookmarkInput,
  UpdateBookmarkInput,
  ListBookmarksQuery,
  BatchMoveInput,
  BatchTagInput,
} from './bookmarks.schemas.js';
import type { Prisma } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookmarkWithTags {
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
  lastCheckedAt: string | null;
  readAt: string | null;
  userId: string;
  collectionId: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const BOOKMARK_INCLUDE = {
  tags: {
    include: { tag: { select: { id: true, name: true, color: true } } },
  },
} satisfies Prisma.BookmarkInclude;

// ── Service methods ───────────────────────────────────────────────────────────

export async function listBookmarks(
  userId: string,
  query: ListBookmarksQuery,
): Promise<{ bookmarks: BookmarkWithTags[]; nextCursor: string | null; total: number }> {
  const limit = typeof query.limit === 'string' ? parseInt(query.limit as string, 10) : query.limit;

  const where: Prisma.BookmarkWhereInput = {
    userId,
    ...(query.collectionId ? { collectionId: query.collectionId } : {}),
    ...(query.isPinned !== undefined ? { isPinned: query.isPinned } : {}),
    ...(query.isFavourite !== undefined ? { isFavourite: query.isFavourite } : {}),
    ...(query.isUnread ? { readAt: null } : {}),
    ...(query.linkStatus ? { linkStatus: query.linkStatus } : {}),
    ...(query.tagIds
      ? {
          tags: {
            some: {
              tagId: {
                in: Array.isArray(query.tagIds) ? query.tagIds : [query.tagIds],
              },
            },
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.bookmark.count({ where }),
    prisma.bookmark.findMany({
      where: {
        ...where,
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
      },
      include: BOOKMARK_INCLUDE,
      orderBy:
        query.sortBy === 'createdAt'
          ? { createdAt: query.sortOrder }
          : query.sortBy === 'title'
            ? { title: query.sortOrder }
            : { url: query.sortOrder },
      take: limit + 1,
    }),
  ]);

  const hasNextPage = items.length > limit;
  const page = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage ? (page[page.length - 1]?.id ?? null) : null;

  return {
    bookmarks: page.map(serialiseBookmark),
    nextCursor,
    total,
  };
}

export async function getBookmark(userId: string, bookmarkId: string): Promise<BookmarkWithTags> {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
    include: BOOKMARK_INCLUDE,
  });
  if (!bookmark || bookmark.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }
  return serialiseBookmark(bookmark);
}

export async function createBookmark(
  userId: string,
  input: CreateBookmarkInput,
): Promise<BookmarkWithTags> {
  // Validate collection ownership
  if (input.collectionId) {
    const collection = await prisma.collection.findUnique({ where: { id: input.collectionId } });
    if (!collection || collection.userId !== userId) {
      throw new AppError(HTTP.NOT_FOUND, 'Collection not found.');
    }
  }

  // Upsert tags (find-or-create by name per user)
  const tagRecords = await Promise.all(
    input.tags.map((tagName) => {
      const normalised = tagName.trim().toLowerCase();
      return prisma.tag.upsert({
        where: { userId_name: { userId, name: normalised } },
        create: { userId, name: normalised },
        update: {},
        select: { id: true },
      });
    }),
  );

  const bookmark = await prisma.bookmark.create({
    data: {
      url: input.url,
      title: input.title ?? new URL(input.url).hostname,
      description: input.description ?? null,
      notes: input.notes ?? null,
      isPublic: input.isPublic,
      isPinned: input.isPinned,
      isFavourite: input.isFavourite,
      userId,
      collectionId: input.collectionId ?? null,
      tags: {
        create: tagRecords.map(({ id }) => ({ tagId: id })),
      },
    },
    include: BOOKMARK_INCLUDE,
  });

  // Enqueue metadata extraction job (fire-and-forget)
  await metadataQueue.add('extract', { bookmarkId: bookmark.id, url: bookmark.url });

  // Enqueue permanent copy capture (fire-and-forget)
  await archiveQueue.add('capture', { bookmarkId: bookmark.id, url: bookmark.url });

  return serialiseBookmark(bookmark);
}

export async function updateBookmark(
  userId: string,
  bookmarkId: string,
  input: UpdateBookmarkInput,
): Promise<BookmarkWithTags> {
  const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }

  if (input.collectionId !== undefined && input.collectionId !== null) {
    const collection = await prisma.collection.findUnique({ where: { id: input.collectionId } });
    if (!collection || collection.userId !== userId) {
      throw new AppError(HTTP.NOT_FOUND, 'Collection not found.');
    }
  }

  // Handle tag updates if provided
  let tagOps: Prisma.BookmarkUpdateInput['tags'] | undefined;
  if (input.tags !== undefined) {
    const tagRecords = await Promise.all(
      input.tags.map((tagName) => {
        const normalised = tagName.trim().toLowerCase();
        return prisma.tag.upsert({
          where: { userId_name: { userId, name: normalised } },
          create: { userId, name: normalised },
          update: {},
          select: { id: true },
        });
      }),
    );
    tagOps = {
      deleteMany: {},
      create: tagRecords.map(({ id }) => ({ tagId: id })),
    };
  }

  const updated = await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
      ...(input.isFavourite !== undefined ? { isFavourite: input.isFavourite } : {}),
      ...(input.readAt !== undefined
        ? { readAt: input.readAt ? new Date(input.readAt) : null }
        : {}),
      ...(tagOps !== undefined ? { tags: tagOps } : {}),
    },
    include: BOOKMARK_INCLUDE,
  });

  return serialiseBookmark(updated);
}

export async function deleteBookmark(userId: string, bookmarkId: string): Promise<void> {
  const existing = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }
  await prisma.bookmark.delete({ where: { id: bookmarkId } });
}

export async function batchDeleteBookmarks(userId: string, ids: string[]): Promise<number> {
  const result = await prisma.bookmark.deleteMany({
    where: { id: { in: ids }, userId },
  });
  return result.count;
}

/** Move multiple bookmarks to a collection (or null = uncollected). */
export async function batchMoveBookmarks(userId: string, input: BatchMoveInput): Promise<number> {
  const result = await prisma.bookmark.updateMany({
    where: { id: { in: input.ids }, userId },
    data: { collectionId: input.collectionId },
  });
  return result.count;
}

/** Add, remove, or replace tags on multiple bookmarks in one transaction. */
export async function batchTagBookmarks(userId: string, input: BatchTagInput): Promise<number> {
  // Verify bookmarks all belong to this user
  const ownedCount = await prisma.bookmark.count({
    where: { id: { in: input.ids }, userId },
  });
  if (ownedCount !== input.ids.length) {
    throw new AppError(HTTP.NOT_FOUND, 'One or more bookmarks not found.');
  }

  await prisma.$transaction(async (tx) => {
    if (input.mode === 'replace' || input.mode === 'remove') {
      await tx.bookmarkTag.deleteMany({
        where: {
          bookmarkId: { in: input.ids },
          tagId: { in: input.tagIds },
        },
      });
    }
    if (input.mode === 'add' || input.mode === 'replace') {
      const pairs = input.ids.flatMap((bookmarkId) =>
        input.tagIds.map((tagId) => ({ bookmarkId, tagId })),
      );
      // skipDuplicates avoids conflicts on existing rows
      await tx.bookmarkTag.createMany({ data: pairs, skipDuplicates: true });
    }
  });

  return input.ids.length;
}

export function getPaginationMeta(
  total: number,
  limit: number,
  nextCursor: string | null,
): { total: number; limit: number; nextCursor: string | null; hasNextPage: boolean } {
  return { total, limit, nextCursor, hasNextPage: nextCursor !== null };
}

// ── Import / Export ───────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Bulk-import bookmarks parsed from a browser HTML export file.
 * For each item, find-or-create the collection hierarchy, then upsert the
 * bookmark (skip duplicates by URL within the same user scope).
 */
export async function importBookmarks(
  userId: string,
  items: import('../../lib/importer.js').ParsedBookmark[],
): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Cache collection IDs to avoid redundant DB queries when many bookmarks share
  // the same folder path.
  const collectionCache = new Map<string, string>(); // path key → collectionId

  async function resolveCollection(breadcrumb: string[]): Promise<string | null> {
    if (breadcrumb.length === 0) return null;

    let parentId: string | null = null;
    for (let depth = 0; depth < breadcrumb.length; depth++) {
      const pathKey = breadcrumb.slice(0, depth + 1).join('/');
      if (collectionCache.has(pathKey)) {
        parentId = collectionCache.get(pathKey)!;
        continue;
      }
      const name = breadcrumb[depth]!;
      // Find-or-create the collection at this depth
      let collection: { id: string } | null = await prisma.collection.findFirst({
        where: { userId, name, parentId },
        select: { id: true },
      });
      if (!collection) {
        collection = await prisma.collection.create({
          data: { userId, name, parentId },
          select: { id: true },
        });
      }
      collectionCache.set(pathKey, collection.id);
      parentId = collection.id;
    }
    return parentId;
  }

  for (const item of items) {
    try {
      // Skip already-saved URLs
      const existing = await prisma.bookmark.findFirst({
        where: { userId, url: item.url },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const collectionId = await resolveCollection(item.collectionPath);

      // Upsert tags
      const tagRecords = await Promise.all(
        item.tags.map((name) =>
          prisma.tag.upsert({
            where: { userId_name: { userId, name } },
            create: { userId, name },
            update: {},
            select: { id: true },
          }),
        ),
      );

      await prisma.bookmark.create({
        data: {
          url: item.url,
          title: item.title,
          userId,
          collectionId,
          ...(item.addedAt ? { createdAt: item.addedAt } : {}),
          tags: { create: tagRecords.map(({ id }) => ({ tagId: id })) },
        },
      });

      imported++;
    } catch (err) {
      errors.push(`Failed to import "${item.url}": ${(err as Error).message}`);
    }
  }

  return { imported, skipped, errors };
}

export interface ExportBookmark {
  url: string;
  title: string;
  description: string | null;
  notes: string | null;
  tags: string[];
  collectionId: string | null;
  createdAt: string;
}

/**
 * Export all bookmarks for a user as a JSON array or a Netscape HTML file.
 * Returns the raw data — the controller sets the Content-Type and filename.
 */
export async function exportBookmarks(
  userId: string,
  format: 'json' | 'html',
): Promise<{ content: string; filename: string; mimeType: string }> {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      tags: { include: { tag: { select: { name: true } } } },
      collection: { select: { name: true } },
    },
  });

  const items: ExportBookmark[] = bookmarks.map((b) => ({
    url: b.url,
    title: b.title,
    description: b.description,
    notes: b.notes,
    tags: b.tags.map(({ tag }) => tag.name),
    collectionId: b.collectionId,
    createdAt: b.createdAt.toISOString(),
  }));

  if (format === 'json') {
    return {
      content: JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), bookmarks: items },
        null,
        2,
      ),
      filename: `mindpalace-bookmarks-${Date.now()}.json`,
      mimeType: 'application/json',
    };
  }

  // Build Netscape Bookmark HTML
  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Mind Palace Bookmarks</TITLE>',
    '<H1>Mind Palace Bookmarks</H1>',
    '<DL><p>',
  ];

  for (const bm of bookmarks) {
    const addDate = Math.floor(new Date(bm.createdAt).getTime() / 1000);
    const tags = bm.tags.map(({ tag }) => tag.name).join(',');
    const tagsAttr = tags ? ` TAGS="${escapeHtml(tags)}"` : '';
    lines.push(
      `    <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${addDate}"${tagsAttr}>${escapeHtml(bm.title)}</A>`,
    );
  }

  lines.push('</DL><p>');

  return {
    content: lines.join('\n'),
    filename: `mindpalace-bookmarks-${Date.now()}.html`,
    mimeType: 'text/html',
  };
}

// ── Permanent copy ────────────────────────────────────────────────────────────

export interface PermanentCopyResult {
  id: string;
  bookmarkId: string;
  articleContent: string | null;
  sizeBytes: number | null;
  capturedAt: string;
  failureReason: string | null;
  mimeType: string;
}

export async function getPermanentCopy(
  userId: string,
  bookmarkId: string,
): Promise<PermanentCopyResult> {
  // Verify ownership
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark || bookmark.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }

  const copy = await prisma.permanentCopy.findUnique({ where: { bookmarkId } });
  if (!copy) {
    throw new AppError(HTTP.NOT_FOUND, 'No permanent copy available yet.');
  }

  return {
    id: copy.id,
    bookmarkId: copy.bookmarkId,
    articleContent: copy.articleContent,
    sizeBytes: copy.sizeBytes,
    capturedAt: copy.capturedAt.toISOString(),
    failureReason: copy.failureReason,
    mimeType: copy.mimeType,
  };
}

// ── Manual link health check ──────────────────────────────────────────────────

export async function checkBookmarkLink(
  userId: string,
  bookmarkId: string,
): Promise<{ queued: true }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark || bookmark.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Bookmark not found.');
  }
  await linkHealthQueue.add('check', { bookmarkId, url: bookmark.url });
  return { queued: true };
}

/** Update bookmark title, description, faviconUrl, coverImageUrl from metadata worker */
export async function updateBookmarkMetadata(
  bookmarkId: string,
  data: {
    title?: string | undefined;
    description?: string | undefined;
    faviconUrl?: string | undefined;
    coverImageUrl?: string | undefined;
  },
): Promise<void> {
  // Strip undefined so Prisma's exactOptionalPropertyTypes check passes
  const prismaData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as { title?: string; description?: string; faviconUrl?: string; coverImageUrl?: string };
  await prisma.bookmark.update({ where: { id: bookmarkId }, data: prismaData });
}
