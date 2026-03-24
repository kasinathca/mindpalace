// ─────────────────────────────────────────────────────────────────────────────
// modules/collections/collections.service.ts — Collection business logic
//
// The collection tree is assembled in-memory from a flat Prisma query.
// Recursive CTEs via Prisma.$queryRaw are used only for the tree read;
// writes use standard Prisma calls.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.middleware.js';
import { HTTP, COLLECTION } from '../../config/constants.js';
import { cacheGet, cacheSet, cacheDel } from '../../lib/cache.js';
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
  DeleteCollectionQuery,
} from './collections.schemas.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CollectionNode {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isPublic: boolean;
  sortOrder: number;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  children: CollectionNode[];
  _count: { bookmarks: number };
}

interface FlatCollection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isPublic: boolean;
  sortOrder: number;
  parentId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { bookmarks: number };
}

/** Minimal shape used only for nesting-depth checks. */
interface CollectionAncestry {
  id: string;
  parentId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a nested tree structure from the flat array returned by Prisma. */
function buildTree(items: FlatCollection[], parentId: string | null = null): CollectionNode[] {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      children: buildTree(items, item.id),
    }));
}

/** Recursively count depth of a node in the flat ancestry list. */
function getDepth(items: CollectionAncestry[], id: string): number {
  let depth = 0;
  let current: CollectionAncestry | undefined = items.find((c) => c.id === id);
  while (current?.parentId) {
    depth += 1;
    current = items.find((c) => c.id === current!.parentId);
    if (depth > COLLECTION.MAX_NESTING_DEPTH) break;
  }
  return depth;
}
// ── Cache helpers ──────────────────────────────────────────────────────────
const CACHE_TTL = 300; // 5 minutes
const collectionCacheKey = (userId: string): string => `collections:${userId}`;

// ── Service methods ───────────────────────────────────────────────────────────

export async function getCollectionTree(userId: string): Promise<CollectionNode[]> {
  const cacheKey = collectionCacheKey(userId);
  const cached = await cacheGet<CollectionNode[]>(cacheKey);
  if (cached) return cached;

  const flat = await prisma.collection.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { bookmarks: true } } },
  });

  const tree = buildTree(flat as FlatCollection[]);
  await cacheSet(cacheKey, tree, CACHE_TTL);
  return tree;
}

export async function createCollection(
  userId: string,
  input: CreateCollectionInput,
): Promise<CollectionNode> {
  // Validate parent ownership + depth
  if (input.parentId) {
    const allCollections = await prisma.collection.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    });
    const parent = allCollections.find((c) => c.id === input.parentId);
    if (!parent) {
      throw new AppError(HTTP.NOT_FOUND, 'Parent collection not found.');
    }
    const depth = getDepth(allCollections, input.parentId);
    if (depth >= COLLECTION.MAX_NESTING_DEPTH) {
      throw new AppError(
        HTTP.BAD_REQUEST,
        `Collections cannot be nested more than ${COLLECTION.MAX_NESTING_DEPTH} levels deep.`,
      );
    }
  }

  const collection = await prisma.collection.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      isPublic: input.isPublic,
      sortOrder: input.sortOrder,
      parentId: input.parentId ?? null,
      userId,
    },
    include: { _count: { select: { bookmarks: true } } },
  });

  const node: CollectionNode = {
    ...collection,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    children: [],
    _count: collection._count,
  };
  await cacheDel(collectionCacheKey(userId));
  return node;
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  input: UpdateCollectionInput,
): Promise<CollectionNode> {
  const existing = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Collection not found.');
  }

  // Prevent moving a collection to be its own descendant
  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === collectionId) {
      throw new AppError(HTTP.BAD_REQUEST, 'A collection cannot be its own parent.');
    }
    // Check that newParent is not a descendant of this collection
    const allCollections = await prisma.collection.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    });

    const isDescendant = (targetId: string, ancestorId: string): boolean => {
      const target = allCollections.find((c) => c.id === targetId);
      if (!target || !target.parentId) return false;
      if (target.parentId === ancestorId) return true;
      return isDescendant(target.parentId, ancestorId);
    };

    if (isDescendant(input.parentId, collectionId)) {
      throw new AppError(
        HTTP.BAD_REQUEST,
        'Cannot move a collection into one of its own descendants.',
      );
    }
  }

  const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
    include: { _count: { select: { bookmarks: true } } },
  });

  // Fetch only the direct children of the updated collection rather than re-fetching
  // the entire tree — avoids a redundant full-table scan on every update.
  const directChildren = await prisma.collection.findMany({
    where: { parentId: collectionId, userId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { bookmarks: true } } },
  });

  const node: CollectionNode = {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    children: directChildren.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      children: [],
    })),
  };
  await cacheDel(collectionCacheKey(userId));
  return node;
}

export async function deleteCollection(
  userId: string,
  collectionId: string,
  query: DeleteCollectionQuery,
): Promise<void> {
  const existing = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { _count: { select: { bookmarks: true } } },
  });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Collection not found.');
  }

  await prisma.$transaction(async (tx) => {
    if (query.action === 'move') {
      if (!query.targetCollectionId) {
        throw new AppError(
          HTTP.BAD_REQUEST,
          'targetCollectionId is required when action is "move".',
        );
      }
      if (query.targetCollectionId === collectionId) {
        throw new AppError(
          HTTP.BAD_REQUEST,
          'targetCollectionId must differ from the collection being deleted.',
        );
      }

      const target = await tx.collection.findUnique({ where: { id: query.targetCollectionId } });
      if (!target || target.userId !== userId) {
        throw new AppError(HTTP.NOT_FOUND, 'Target collection not found.');
      }

      // Move bookmarks to target collection before deleting source collection.
      await tx.bookmark.updateMany({
        where: { collectionId, userId },
        data: { collectionId: query.targetCollectionId },
      });
    } else {
      // With Restrict FK, delete-mode must explicitly remove member bookmarks first.
      await tx.bookmark.deleteMany({
        where: { collectionId, userId },
      });
    }

    await tx.collection.delete({ where: { id: collectionId } });
  });

  await cacheDel(collectionCacheKey(userId));
}

export async function reorderCollection(
  userId: string,
  collectionId: string,
  sortOrder: number,
): Promise<void> {
  const existing = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError(HTTP.NOT_FOUND, 'Collection not found.');
  }
  await prisma.collection.update({ where: { id: collectionId }, data: { sortOrder } });
  await cacheDel(collectionCacheKey(userId));
}
