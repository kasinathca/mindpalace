// ─────────────────────────────────────────────────────────────────────────────
// modules/collections/collections.test.ts — Unit tests for CollectionService
//
// All Prisma calls are mocked so these tests run without a real database.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../middleware/errorHandler.middleware.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookmark: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../lib/cache.js', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../lib/prisma.js';
import {
  getCollectionTree,
  createCollection,
  updateCollection,
  deleteCollection,
} from './collections.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user_01';

const flatRoot = {
  id: 'col_01',
  name: 'Root',
  description: null,
  color: null,
  icon: null,
  isPublic: false,
  sortOrder: 0,
  parentId: null,
  userId: USER_ID,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  _count: { bookmarks: 2 },
};

const flatChild = {
  id: 'col_02',
  name: 'Child',
  description: null,
  color: null,
  icon: null,
  isPublic: false,
  sortOrder: 0,
  parentId: 'col_01',
  userId: USER_ID,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  _count: { bookmarks: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((callback: (tx: typeof prisma) => unknown) => {
    return Promise.resolve(callback(prisma));
  });
});

// ── getCollectionTree ─────────────────────────────────────────────────────────

describe('CollectionService.getCollectionTree', () => {
  it('returns a nested tree from flat prisma results', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([flatRoot, flatChild] as never);

    const tree = await getCollectionTree(USER_ID);

    expect(tree).toHaveLength(1); // one root
    expect(tree[0]?.id).toBe('col_01');
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe('col_02');
  });

  it('returns empty array when user has no collections', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);

    const tree = await getCollectionTree(USER_ID);
    expect(tree).toHaveLength(0);
  });
});

// ── createCollection ──────────────────────────────────────────────────────────

describe('CollectionService.createCollection', () => {
  it('creates a root collection (no parentId)', async () => {
    vi.mocked(prisma.collection.create).mockResolvedValue(flatRoot as never);

    const result = await createCollection(USER_ID, { name: 'Root', isPublic: false, sortOrder: 0 });

    expect(result.id).toBe('col_01');
    expect(result.name).toBe('Root');
    expect(result.children).toHaveLength(0);
    // dates should be ISO strings
    expect(result.createdAt).toMatch(/^\d{4}-/);
  });

  it('creates a child collection under an existing parent', async () => {
    // findMany returns parent list
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_01', parentId: null },
    ] as never);
    vi.mocked(prisma.collection.create).mockResolvedValue(flatChild as never);

    const result = await createCollection(USER_ID, {
      name: 'Child',
      parentId: 'col_01',
      isPublic: false,
      sortOrder: 0,
    });
    expect(result.parentId).toBe('col_01');
  });

  it('throws NOT_FOUND when parentId does not exist', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);

    await expect(
      createCollection(USER_ID, {
        name: 'Child',
        parentId: 'nonexistent',
        isPublic: false,
        sortOrder: 0,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ── updateCollection ──────────────────────────────────────────────────────────

describe('CollectionService.updateCollection', () => {
  it('throws NOT_FOUND when collection does not exist', async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

    await expect(
      updateCollection(USER_ID, 'nonexistent', { name: 'New Name' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('throws BAD_REQUEST when making a collection its own parent', async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(flatRoot as never);

    await expect(
      updateCollection(USER_ID, 'col_01', { parentId: 'col_01' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ── deleteCollection ──────────────────────────────────────────────────────────

describe('CollectionService.deleteCollection', () => {
  it('deletes a collection without action', async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(flatRoot as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_01', parentId: null },
    ] as never);
    vi.mocked(prisma.bookmark.count).mockResolvedValue(2 as never);
    vi.mocked(prisma.bookmark.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.collection.delete).mockResolvedValue(flatRoot as never);

    await expect(deleteCollection(USER_ID, 'col_01', { action: 'delete' })).resolves.toEqual({
      action: 'delete',
      deletedCollectionId: 'col_01',
      affectedBookmarkCount: 2,
    });

    expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: { in: ['col_01'] }, userId: USER_ID },
    });
    expect(prisma.collection.delete).toHaveBeenCalledWith({ where: { id: 'col_01' } });
  });

  it('throws NOT_FOUND when collection does not exist', async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

    await expect(
      deleteCollection(USER_ID, 'nonexistent', { action: 'delete' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('moves bookmarks to target before deleting when action=move', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_01', parentId: null },
      { id: 'col_99', parentId: null },
    ] as never);
    vi.mocked(prisma.collection.findUnique)
      .mockResolvedValueOnce(flatRoot as never) // existing
      .mockResolvedValueOnce({ id: 'col_99', userId: USER_ID } as never); // target
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue([
      { id: 'bm_01' },
      { id: 'bm_02' },
    ] as never);
    vi.mocked(prisma.bookmark.updateMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.collection.delete).mockResolvedValue(flatRoot as never);

    await expect(
      deleteCollection(USER_ID, 'col_01', {
        action: 'move',
        targetCollectionId: 'col_99',
      }),
    ).resolves.toEqual({
      action: 'move',
      deletedCollectionId: 'col_01',
      affectedBookmarkCount: 2,
      movedBookmarkIds: ['bm_01', 'bm_02'],
      targetCollectionId: 'col_99',
    });

    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { collectionId: { in: ['col_01'] }, userId: USER_ID },
      data: { collectionId: 'col_99' },
    });
    expect(prisma.bookmark.deleteMany).not.toHaveBeenCalled();
  });
});
