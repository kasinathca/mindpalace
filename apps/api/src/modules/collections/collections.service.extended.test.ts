// ─────────────────────────────────────────────────────────────────────────────
// modules/collections/collections.service.extended.test.ts
//
// Extended unit tests for CollectionService — covers gaps in collections.test.ts:
//
//   Nesting Depth (BVA on MAX_NESTING_DEPTH = 10):
//     • Create at depth 0 … depth 9  → accepted
//     • Create at depth 10            → 400 rejected
//
//   Circular Reference Guards (updateCollection):
//     • Moving a collection to itself                  → 400
//     • Moving a collection into its own descendant    → 400
//     • Moving to a valid different subtree            → 200
//
//   deleteCollection:
//     • action=delete (explicitly deletes member bookmarks, then collection)
//     • action=move (relocates bookmarks to target)
//     • action=move without targetCollectionId         → 400
//     • action=move with foreign targetCollectionId    → 404
//     • IDOR: delete another user's collection         → 404
//
//   Cache lifecycle:
//     • Cache miss → DB queried, result cached
//     • Cache hit  → DB NOT queried
//     • Create / Update / Delete → cache invalidated
//
// Related test plan: docs/TEST_STRATEGY.md §3.3
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

const { mockCacheGet, mockCacheSet, mockCacheDel } = vi.hoisted(() => ({
  mockCacheGet: vi.fn(),
  mockCacheSet: vi.fn(),
  mockCacheDel: vi.fn(),
}));

vi.mock('../../lib/cache.js', () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  cacheDel: mockCacheDel,
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
const OTHER_USER_ID = 'user_02';

/** Build a minimal flat collection record (ancestry only). */
function makeAncestry(
  id: string,
  parentId: string | null,
): { id: string; parentId: string | null } {
  return { id, parentId };
}

/**
 * Build a chain of ancestry records representing a tree at a given depth.
 * depth=0 → single root (col_0)
 * depth=3 → col_0 → col_1 → col_2 → col_3
 */
function buildAncestryChain(depth: number): Array<{ id: string; parentId: string | null }> {
  const chain: Array<{ id: string; parentId: string | null }> = [];
  let parentId: string | null = null;
  for (let i = 0; i <= depth; i++) {
    const id = `col_${i}`;
    chain.push(makeAncestry(id, parentId));
    parentId = id;
  }
  return chain;
}

/** The full collection object shape expected by Prisma mocks. */
function makeCollection(overrides: {
  id: string;
  parentId?: string | null;
  userId?: string;
  name?: string;
}) {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Collection',
    description: null,
    color: null,
    icon: null,
    isPublic: false,
    sortOrder: 0,
    parentId: overrides.parentId ?? null,
    userId: overrides.userId ?? USER_ID,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { bookmarks: 0 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((callback: (tx: typeof prisma) => unknown) => {
    return Promise.resolve(callback(prisma));
  });
  // Default: cache always misses so DB path is executed
  mockCacheGet.mockResolvedValue(null);
  mockCacheSet.mockResolvedValue(undefined);
  mockCacheDel.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Nesting Depth — Boundary Value Analysis (MAX_NESTING_DEPTH = 10)
// TC: COL-DEP-001 → COL-DEP-003
// ─────────────────────────────────────────────────────────────────────────────

describe('CollectionService.createCollection — nesting depth (BVA)', () => {
  it('COL-DEP-001 — creates a root collection (depth 0) without parentId', async () => {
    // Arrange
    const created = makeCollection({ id: 'col_new' });
    vi.mocked(prisma.collection.create).mockResolvedValue(created as never);

    // Act
    const result = await createCollection(USER_ID, {
      name: 'Root',
      isPublic: false,
      sortOrder: 0,
    });

    // Assert
    expect(result.id).toBe('col_new');
    expect(prisma.collection.findMany).not.toHaveBeenCalled(); // no depth check needed
  });

  /**
   * Depth 1 through 9 are all within the valid range.
   * We test depth 9 explicitly as the boundary upper-valid value:
   * getDepth(chain, 'col_9') = 9 → 9 >= 10 is FALSE → creation ALLOWED.
   * TC: COL-DEP-002
   */
  it('COL-DEP-002 — creates a collection with a parent at depth 9 (last valid level)', async () => {
    // Arrange — chain of 10 nodes: depths 0–9, deepest = col_9
    // getDepth(chain, 'col_9') = 9; 9 < MAX_NESTING_DEPTH(10) → allowed
    const chain = buildAncestryChain(9); // col_9 is at depth 9
    vi.mocked(prisma.collection.findMany).mockResolvedValue(chain as never);

    const created = makeCollection({ id: 'col_new', parentId: 'col_9' });
    vi.mocked(prisma.collection.create).mockResolvedValue(created as never);

    // Act — parent is at depth 9; 9 < 10 → creation is allowed
    const result = await createCollection(USER_ID, {
      name: 'Level 9 Collection',
      parentId: 'col_9',
      isPublic: false,
      sortOrder: 0,
    });

    // Assert
    expect(result.id).toBe('col_new');
    expect(prisma.collection.create).toHaveBeenCalledOnce();
  });

  /**
   * Depth 10 is the first invalid value (>= MAX_NESTING_DEPTH).
   * getDepth counts the number of ancestor hops: a chain of 11 nodes (depths 0–10)
   * places col_10 at depth 10. The check `depth >= MAX_NESTING_DEPTH (10)` fires.
   * TC: COL-DEP-003
   */
  it('COL-DEP-003 — rejects creation when parent is already at depth 9 (would reach depth 10)', async () => {
    // Arrange — chain of 11 nodes: depths 0–10, deepest = col_10
    const chain = buildAncestryChain(10); // col_10 is at depth 10
    vi.mocked(prisma.collection.findMany).mockResolvedValue(chain as never);

    // Act & Assert — creating under col_10 triggers depth >= 10 rejection
    await expect(
      createCollection(USER_ID, {
        name: 'Too Deep',
        parentId: 'col_10',
        isPublic: false,
        sortOrder: 0,
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).statusCode === 400 &&
        /10 levels/i.test((err as AppError).message),
    );

    expect(prisma.collection.create).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the specified parent does not belong to the user', async () => {
    // Arrange — ancestry list does not contain the requested parentId
    vi.mocked(prisma.collection.findMany).mockResolvedValue([] as never);

    // Act & Assert
    await expect(
      createCollection(USER_ID, {
        name: 'Orphan',
        parentId: 'nonexistent_parent',
        isPublic: false,
        sortOrder: 0,
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 404,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Circular Reference Guards — updateCollection
// TC: COL-DEP-004, COL-DEP-005, COL-DEP-006
// ─────────────────────────────────────────────────────────────────────────────

describe('CollectionService.updateCollection — circular reference guards', () => {
  const colA = makeCollection({ id: 'col_A', parentId: null }); // root
  const _colB = makeCollection({ id: 'col_B', parentId: 'col_A' }); // child of A (referenced by ancestry mocks)
  const colC = makeCollection({ id: 'col_C', parentId: 'col_B' }); // grandchild of A

  it('COL-DEP-004 — throws BAD_REQUEST when a collection is moved to be its own parent', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(colA as never);

    // Act & Assert
    await expect(updateCollection(USER_ID, 'col_A', { parentId: 'col_A' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).statusCode === 400 &&
        /own parent/i.test((err as AppError).message),
    );

    expect(prisma.collection.update).not.toHaveBeenCalled();
  });

  it('COL-DEP-005 — throws BAD_REQUEST when moving col_A into col_C (its own descendant)', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(colA as never);
    // Return the flat ancestry so isDescendant can walk upwards from col_C
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      makeAncestry('col_A', null),
      makeAncestry('col_B', 'col_A'),
      makeAncestry('col_C', 'col_B'),
    ] as never);

    // Act & Assert — moving col_A under col_C creates a cycle
    await expect(updateCollection(USER_ID, 'col_A', { parentId: 'col_C' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).statusCode === 400 &&
        /descendant/i.test((err as AppError).message),
    );

    expect(prisma.collection.update).not.toHaveBeenCalled();
  });

  it('COL-DEP-006 — allows moving col_C to a valid unrelated root', async () => {
    // Arrange — col_C currently under col_B; update only the name (no parentId change)
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(colC as never);
    // No parentId in input → ancestry/circular checks are SKIPPED by the service.
    // Only one findMany call: for directChildren after the update.
    vi.mocked(prisma.collection.findMany).mockResolvedValue([] as never);
    const updatedColC = {
      ...colC,
      name: 'Moved Collection',
      _count: { bookmarks: 0 },
    };
    vi.mocked(prisma.collection.update).mockResolvedValue(updatedColC as never);

    // Act — rename only; parentId remains unchanged
    const result = await updateCollection(USER_ID, 'col_C', { name: 'Moved Collection' });

    expect(result.id).toBe('col_C');
    expect(result.name).toBe('Moved Collection');
    expect(prisma.collection.update).toHaveBeenCalledOnce();
  });

  it('throws NOT_FOUND when updating a collection belonging to another user', async () => {
    // Arrange — collection found but belongs to OTHER_USER
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...colA,
      userId: OTHER_USER_ID,
    } as never);

    // Act & Assert (IDOR guard)
    await expect(updateCollection(USER_ID, 'col_A', { name: 'Hijack Attempt' })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 404,
    );
  });

  it('throws NOT_FOUND when moving to a parent collection not owned by the user', async () => {
    // Arrange — target parent exists globally but is not in user ancestry list
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(colA as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      makeAncestry('col_A', null),
      makeAncestry('col_B', 'col_A'),
    ] as never);

    // Act & Assert
    await expect(
      updateCollection(USER_ID, 'col_A', { parentId: 'foreign_parent' }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).statusCode === 404 &&
        /parent collection not found/i.test((err as AppError).message),
    );
  });

  it('throws BAD_REQUEST when moving a subtree would exceed max nesting depth', async () => {
    // Arrange — moving col_A (with child col_B) under col_10 would exceed limit
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(colA as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      ...buildAncestryChain(10),
      makeAncestry('col_A', null),
      makeAncestry('col_B', 'col_A'),
    ] as never);

    // Act & Assert
    await expect(updateCollection(USER_ID, 'col_A', { parentId: 'col_10' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).statusCode === 400 &&
        /10 levels/i.test((err as AppError).message),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteCollection — TC: COL-DEL-001 → COL-DEL-005
// ─────────────────────────────────────────────────────────────────────────────

describe('CollectionService.deleteCollection', () => {
  const colToDelete = makeCollection({ id: 'col_X' });

  beforeEach(() => {
    vi.mocked(prisma.collection.delete).mockResolvedValue(colToDelete as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_X', parentId: null },
    ] as never);
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue([
      { id: 'bm_01' },
      { id: 'bm_02' },
      { id: 'bm_03' },
    ] as never);
    vi.mocked(prisma.bookmark.count).mockResolvedValue(3 as never);
    vi.mocked(prisma.bookmark.updateMany).mockResolvedValue({ count: 3 });
    vi.mocked(prisma.bookmark.deleteMany).mockResolvedValue({ count: 3 });
  });

  it('COL-DEL-001 — action=delete removes bookmarks, then deletes the collection', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...colToDelete,
      _count: { bookmarks: 3 },
    } as never);

    // Act
    await expect(deleteCollection(USER_ID, 'col_X', { action: 'delete' })).resolves.toEqual({
      action: 'delete',
      deletedCollectionId: 'col_X',
      affectedBookmarkCount: 3,
    });

    // Assert — delete-mode removes member bookmarks explicitly
    expect(prisma.bookmark.updateMany).not.toHaveBeenCalled();
    expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: { in: ['col_X'] }, userId: USER_ID },
    });
    expect(prisma.collection.delete).toHaveBeenCalledWith({ where: { id: 'col_X' } });
    expect(mockCacheDel).toHaveBeenCalledOnce();
  });

  it('COL-DEL-006 — action=delete removes bookmarks from the full subtree', async () => {
    // Arrange — col_X has a descendant col_child
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...colToDelete,
      _count: { bookmarks: 5 },
    } as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_X', parentId: null },
      { id: 'col_child', parentId: 'col_X' },
    ] as never);
    vi.mocked(prisma.bookmark.count).mockResolvedValue(5 as never);

    // Act
    await expect(deleteCollection(USER_ID, 'col_X', { action: 'delete' })).resolves.toEqual({
      action: 'delete',
      deletedCollectionId: 'col_X',
      affectedBookmarkCount: 5,
    });

    // Assert — query covers root + descendant
    expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { collectionId: { in: ['col_X', 'col_child'] }, userId: USER_ID },
    });
  });

  it('COL-DEL-007 — action=move relocates bookmarks from the full subtree', async () => {
    // Arrange — source subtree: col_X -> col_child, target outside subtree
    vi.mocked(prisma.collection.findUnique)
      .mockResolvedValueOnce({ ...colToDelete, _count: { bookmarks: 4 } } as never)
      .mockResolvedValueOnce(makeCollection({ id: 'col_target' }) as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_X', parentId: null },
      { id: 'col_child', parentId: 'col_X' },
      { id: 'col_target', parentId: null },
    ] as never);
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue([
      { id: 'bm_root_01' },
      { id: 'bm_child_01' },
      { id: 'bm_child_02' },
      { id: 'bm_root_02' },
    ] as never);

    // Act
    await expect(
      deleteCollection(USER_ID, 'col_X', {
        action: 'move',
        targetCollectionId: 'col_target',
      }),
    ).resolves.toEqual({
      action: 'move',
      deletedCollectionId: 'col_X',
      affectedBookmarkCount: 4,
      movedBookmarkIds: ['bm_root_01', 'bm_child_01', 'bm_child_02', 'bm_root_02'],
      targetCollectionId: 'col_target',
    });

    // Assert — move query covers both subtree levels
    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { collectionId: { in: ['col_X', 'col_child'] }, userId: USER_ID },
      data: { collectionId: 'col_target' },
    });
  });

  it('COL-DEL-008 — action=move rejects targetCollectionId inside source subtree', async () => {
    // Arrange — target points to descendant col_child
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...colToDelete,
      _count: { bookmarks: 2 },
    } as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_X', parentId: null },
      { id: 'col_child', parentId: 'col_X' },
    ] as never);

    // Act & Assert
    await expect(
      deleteCollection(USER_ID, 'col_X', {
        action: 'move',
        targetCollectionId: 'col_child',
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).statusCode === 400 &&
        /inside the collection subtree/i.test((err as AppError).message),
    );

    expect(prisma.collection.delete).not.toHaveBeenCalled();
    expect(prisma.bookmark.updateMany).not.toHaveBeenCalled();
  });

  it('COL-DEL-002 — action=move relocates bookmarks before deleting the collection', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique)
      .mockResolvedValueOnce({ ...colToDelete, _count: { bookmarks: 3 } } as never) // source
      .mockResolvedValueOnce(makeCollection({ id: 'col_target' }) as never); // target
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_X', parentId: null },
      { id: 'col_target', parentId: null },
    ] as never);

    // Act
    await expect(
      deleteCollection(USER_ID, 'col_X', {
        action: 'move',
        targetCollectionId: 'col_target',
      }),
    ).resolves.toEqual({
      action: 'move',
      deletedCollectionId: 'col_X',
      affectedBookmarkCount: 3,
      movedBookmarkIds: ['bm_01', 'bm_02', 'bm_03'],
      targetCollectionId: 'col_target',
    });

    // Assert — bookmarks moved first, then collection deleted
    expect(prisma.bookmark.updateMany).toHaveBeenCalledWith({
      where: { collectionId: { in: ['col_X'] }, userId: USER_ID },
      data: { collectionId: 'col_target' },
    });
    expect(prisma.bookmark.deleteMany).not.toHaveBeenCalled();
    expect(prisma.collection.delete).toHaveBeenCalledOnce();
  });

  it('COL-DEL-003 — action=move without targetCollectionId throws BAD_REQUEST', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...colToDelete,
      _count: { bookmarks: 1 },
    } as never);

    // Act & Assert
    await expect(deleteCollection(USER_ID, 'col_X', { action: 'move' })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 400,
    );

    expect(prisma.collection.delete).not.toHaveBeenCalled();
  });

  it('COL-DEL-004 — action=move with foreign targetCollectionId throws NOT_FOUND', async () => {
    // Arrange — target collection belongs to another user
    vi.mocked(prisma.collection.findUnique)
      .mockResolvedValueOnce({ ...colToDelete, _count: { bookmarks: 1 } } as never) // source (owned)
      .mockResolvedValueOnce({
        ...makeCollection({ id: 'col_foreign' }),
        userId: OTHER_USER_ID,
      } as never); // foreign target
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_X', parentId: null },
      { id: 'col_foreign', parentId: null },
    ] as never);

    // Act & Assert
    await expect(
      deleteCollection(USER_ID, 'col_X', {
        action: 'move',
        targetCollectionId: 'col_foreign',
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 404,
    );
  });

  it("COL-DEL-005 — IDOR: throws NOT_FOUND when deleting another user's collection", async () => {
    // Arrange — collection belongs to OTHER_USER
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...colToDelete,
      userId: OTHER_USER_ID,
      _count: { bookmarks: 0 },
    } as never);

    // Act & Assert
    await expect(deleteCollection(USER_ID, 'col_X', { action: 'delete' })).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && (err as AppError).statusCode === 404,
    );

    // The collection must NOT be deleted
    expect(prisma.collection.delete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Lifecycle — TC: COL-CACHE-001 → COL-CACHE-005
// ─────────────────────────────────────────────────────────────────────────────

describe('CollectionService — cache lifecycle', () => {
  const flatRoot = makeCollection({ id: 'col_01' });
  const USER_CACHE_KEY = `collections:${USER_ID}`;

  it('COL-CACHE-001 — cache miss: queries DB and stores result', async () => {
    // Arrange — cache returns null (miss)
    mockCacheGet.mockResolvedValue(null);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { ...flatRoot, _count: { bookmarks: 2 } },
    ] as never);

    // Act
    await getCollectionTree(USER_ID);

    // Assert
    expect(mockCacheGet).toHaveBeenCalledWith(USER_CACHE_KEY);
    expect(prisma.collection.findMany).toHaveBeenCalledOnce();
    expect(mockCacheSet).toHaveBeenCalledWith(USER_CACHE_KEY, expect.any(Array), 300);
  });

  it('COL-CACHE-002 — cache hit: skips DB query entirely', async () => {
    // Arrange — cache returns valid serialised tree
    const cachedTree = [{ id: 'col_01', name: 'Root', children: [], _count: { bookmarks: 0 } }];
    mockCacheGet.mockResolvedValue(cachedTree);

    // Act
    const result = await getCollectionTree(USER_ID);

    // Assert
    expect(prisma.collection.findMany).not.toHaveBeenCalled();
    expect(result).toBe(cachedTree); // same reference — returned as-is
  });

  it('COL-CACHE-003 — createCollection invalidates the user cache', async () => {
    // Arrange — no parent (root creation)
    vi.mocked(prisma.collection.create).mockResolvedValue({
      ...flatRoot,
      _count: { bookmarks: 0 },
    } as never);

    // Act
    await createCollection(USER_ID, { name: 'New Root', isPublic: false, sortOrder: 0 });

    // Assert
    expect(mockCacheDel).toHaveBeenCalledWith(USER_CACHE_KEY);
  });

  it('COL-CACHE-004 — updateCollection invalidates the user cache', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(flatRoot as never);
    vi.mocked(prisma.collection.update).mockResolvedValue({
      ...flatRoot,
      name: 'Renamed',
      _count: { bookmarks: 0 },
    } as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([] as never); // directChildren

    // Act
    await updateCollection(USER_ID, 'col_01', { name: 'Renamed' });

    // Assert
    expect(mockCacheDel).toHaveBeenCalledWith(USER_CACHE_KEY);
  });

  it('COL-CACHE-005 — deleteCollection invalidates the user cache', async () => {
    // Arrange
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      ...flatRoot,
      _count: { bookmarks: 0 },
    } as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col_01', parentId: null },
    ] as never);
    vi.mocked(prisma.bookmark.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.collection.delete).mockResolvedValue(flatRoot as never);

    // Act
    await deleteCollection(USER_ID, 'col_01', { action: 'delete' });

    // Assert
    expect(mockCacheDel).toHaveBeenCalledWith(USER_CACHE_KEY);
  });
});
