// ─────────────────────────────────────────────────────────────────────────────
// modules/tags/tags.service.ts — Tag business logic
//
// Rules:
//   • Tag names are unique per user (case-insensitive, normalised to lowercase)
//   • Deleting a tag removes BookmarkTag rows via Cascade (DB-level)
//   • Merging reassigns all bookmark_tags from N source tags → 1 target tag,
//     then deletes the source tags
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.middleware.js';
import { HTTP } from '../../config/constants.js';
import { cacheGet, cacheSet, cacheDel } from '../../lib/cache.js';
import type { CreateTagInput, UpdateTagInput, MergeTagsInput } from './tags.schemas.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TagWithCount {
  id: string;
  name: string;
  color: string | null;
  userId: string;
  createdAt: string;
  bookmarkCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function serialiseTag(tag: {
  id: string;
  name: string;
  color: string | null;
  userId: string;
  createdAt: Date;
  _count: { bookmarks: number };
}): TagWithCount {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    userId: tag.userId,
    createdAt: tag.createdAt.toISOString(),
    bookmarkCount: tag._count.bookmarks,
  };
}

// ── Cache helpers ──────────────────────────────────────────────────────────
const CACHE_TTL = 300; // 5 minutes
const tagCacheKey = (userId: string): string => `tags:${userId}`;

// ── Service methods ─────────────────────────────────────────────────

/** Return all tags owned by userId, ordered by name, with bookmark counts. */
export async function listTags(userId: string): Promise<TagWithCount[]> {
  const cacheKey = tagCacheKey(userId);
  const cached = await cacheGet<TagWithCount[]>(cacheKey);
  if (cached) return cached;

  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { bookmarks: true } } },
  });
  const result = tags.map(serialiseTag);
  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

/** Create a new tag for the user. Name uniqueness is enforced at DB level. */
export async function createTag(userId: string, input: CreateTagInput): Promise<TagWithCount> {
  const existing = await prisma.tag.findFirst({
    where: {
      userId,
      name: { equals: input.name, mode: 'insensitive' },
    },
  });
  if (existing) {
    throw new AppError(HTTP.CONFLICT, `Tag "${input.name}" already exists.`);
  }

  const tag = await prisma.tag.create({
    data: {
      name: input.name,
      color: input.color ?? null,
      userId,
    },
    include: { _count: { select: { bookmarks: true } } },
  });
  await cacheDel(tagCacheKey(userId));
  return serialiseTag(tag);
}

/** Update a tag's name or color. */
export async function updateTag(
  userId: string,
  tagId: string,
  input: UpdateTagInput,
): Promise<TagWithCount> {
  const existing = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Tag not found.');
  }

  // If renaming, check uniqueness
  if (input.name && input.name !== existing.name) {
    const nameConflict = await prisma.tag.findFirst({
      where: {
        userId,
        name: { equals: input.name, mode: 'insensitive' },
        NOT: { id: tagId },
      },
    });
    if (nameConflict) {
      throw new AppError(HTTP.CONFLICT, `Tag "${input.name}" already exists.`);
    }
  }

  const tag = await prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    include: { _count: { select: { bookmarks: true } } },
  });
  await cacheDel(tagCacheKey(userId));
  return serialiseTag(tag);
}

/** Delete a tag. BookmarkTag rows are removed by Cascade. */
export async function deleteTag(userId: string, tagId: string): Promise<void> {
  const existing = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Tag not found.');
  }
  await prisma.tag.delete({ where: { id: tagId } });
  await cacheDel(tagCacheKey(userId));
}

/**
 * Merge N source tags → 1 target tag.
 *
 * For each source tag: any BookmarkTag row that links a bookmark to the source
 * is upserted to instead link to the target (skipping if the bookmark already
 * has the target tag, because the composite PK would conflict). Then the
 * source tags are deleted.
 */
export async function mergeTags(userId: string, input: MergeTagsInput): Promise<TagWithCount> {
  // Validate target ownership
  const target = await prisma.tag.findUnique({ where: { id: input.targetId } });
  if (!target || target.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Target tag not found.');
  }

  // Validate all sources are owned by this user and are not the target
  const filteredSourceIds = input.sourceIds.filter((id) => id !== input.targetId);
  if (filteredSourceIds.length === 0) {
    throw new AppError(HTTP.BAD_REQUEST, 'Source IDs must differ from the target tag.');
  }

  const sources = await prisma.tag.findMany({
    where: { id: { in: filteredSourceIds }, userId },
  });
  if (sources.length !== filteredSourceIds.length) {
    throw new AppError(HTTP.NOT_FOUND, 'One or more source tags not found.');
  }

  // Reassign bookmark_tags in a transaction
  await prisma.$transaction(async (tx) => {
    for (const sourceId of filteredSourceIds) {
      // Fetch all bookmark IDs linked to this source tag
      const sourceLinks = await tx.bookmarkTag.findMany({
        where: { tagId: sourceId },
        select: { bookmarkId: true },
      });

      for (const { bookmarkId } of sourceLinks) {
        // Upsert: if the bookmark already has the target tag, skip
        await tx.bookmarkTag.upsert({
          where: { bookmarkId_tagId: { bookmarkId, tagId: input.targetId } },
          create: { bookmarkId, tagId: input.targetId },
          update: {}, // no-op if already exists
        });
      }

      // Delete the source tag (cascade removes bookmark_tags rows)
      await tx.tag.delete({ where: { id: sourceId } });
    }
  });

  const updatedTarget = await prisma.tag.findUniqueOrThrow({
    where: { id: input.targetId },
    include: { _count: { select: { bookmarks: true } } },
  });
  await cacheDel(tagCacheKey(userId));
  return serialiseTag(updatedTarget);
}
