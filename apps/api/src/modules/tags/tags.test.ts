// ─────────────────────────────────────────────────────────────────────────────
// modules/tags/tags.test.ts — Unit tests for TagService
//
// All Prisma calls are mocked so these tests run without a real database.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../middleware/errorHandler.middleware.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookmarkTag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../lib/cache.js', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../lib/prisma.js';
import { listTags, createTag, updateTag, deleteTag, mergeTags } from './tags.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user_01';
const TAG_ID = 'tag_01';

const mockTag = {
  id: TAG_ID,
  name: 'react',
  color: '#6366F1',
  userId: USER_ID,
  createdAt: new Date('2026-01-01'),
  _count: { bookmarks: 3 },
};

const mockTagNoColor = {
  id: 'tag_02',
  name: 'typescript',
  color: null,
  userId: USER_ID,
  createdAt: new Date('2026-01-01'),
  _count: { bookmarks: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: $transaction calls the callback with the prisma mock itself
  vi.mocked(prisma.$transaction).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  );
});

// ── listTags ──────────────────────────────────────────────────────────────────

describe('TagService.listTags', () => {
  it('returns all tags for the user with bookmark counts', async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([mockTag, mockTagNoColor] as never);

    const tags = await listTags(USER_ID);

    expect(tags).toHaveLength(2);
    expect(tags[0]?.name).toBe('react');
    expect(tags[0]?.bookmarkCount).toBe(3);
    expect(tags[1]?.bookmarkCount).toBe(0);
    expect(tags[0]?.createdAt).toMatch(/^\d{4}-/); // ISO string
  });

  it('returns empty array when user has no tags', async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);

    const tags = await listTags(USER_ID);
    expect(tags).toHaveLength(0);
  });
});

// ── createTag ─────────────────────────────────────────────────────────────────

describe('TagService.createTag', () => {
  it('creates a tag and returns it with bookmarkCount 0', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null); // no duplicate
    vi.mocked(prisma.tag.create).mockResolvedValue(mockTag as never);

    const result = await createTag(USER_ID, {
      name: 'react',
      isPublic: false,
      sortOrder: 0,
    } as never);

    expect(result.id).toBe(TAG_ID);
    expect(result.name).toBe('react');
  });

  it('throws CONFLICT when tag name already exists', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(mockTag as never);

    await expect(createTag(USER_ID, { name: 'react' } as never)).rejects.toBeInstanceOf(AppError);
  });
});

// ── updateTag ─────────────────────────────────────────────────────────────────

describe('TagService.updateTag', () => {
  it('updates the tag name', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValueOnce(mockTag as never);
    vi.mocked(prisma.tag.findUnique).mockResolvedValueOnce(null); // no name conflict
    vi.mocked(prisma.tag.update).mockResolvedValue({ ...mockTag, name: 'vue' } as never);

    const result = await updateTag(USER_ID, TAG_ID, { name: 'vue' });

    expect(result.name).toBe('vue');
  });

  it('throws NOT_FOUND when tag does not belong to the user', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue({
      ...mockTag,
      userId: 'other_user',
    } as never);

    await expect(updateTag(USER_ID, TAG_ID, { name: 'x' })).rejects.toBeInstanceOf(AppError);
  });

  it('throws NOT_FOUND when tag does not exist', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null);

    await expect(updateTag(USER_ID, TAG_ID, { name: 'x' })).rejects.toBeInstanceOf(AppError);
  });
});

// ── deleteTag ─────────────────────────────────────────────────────────────────

describe('TagService.deleteTag', () => {
  it('deletes an owned tag', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(mockTag as never);
    vi.mocked(prisma.tag.delete).mockResolvedValue(mockTag as never);

    await expect(deleteTag(USER_ID, TAG_ID)).resolves.toBeUndefined();
    expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: TAG_ID } });
  });

  it('throws NOT_FOUND for a foreign tag', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null);

    await expect(deleteTag(USER_ID, TAG_ID)).rejects.toBeInstanceOf(AppError);
  });
});

// ── mergeTags ─────────────────────────────────────────────────────────────────

describe('TagService.mergeTags', () => {
  const TARGET_ID = 'tag_target';
  const SOURCE_ID = 'tag_source';

  const targetTag = { ...mockTag, id: TARGET_ID, name: 'target' };
  const sourceTag = { ...mockTag, id: SOURCE_ID, name: 'source' };

  it('merges source tag into target and returns updated target', async () => {
    vi.mocked(prisma.tag.findUnique)
      .mockResolvedValueOnce(targetTag as never) // target lookup
      .mockResolvedValueOnce(sourceTag as never); // sources bulk lookup (via findMany)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([sourceTag] as never);
    vi.mocked(prisma.bookmarkTag.findMany).mockResolvedValue([{ bookmarkId: 'bm_01' }] as never);
    vi.mocked(prisma.bookmarkTag.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.tag.delete).mockResolvedValue(sourceTag as never);
    vi.mocked(prisma.tag.findUniqueOrThrow).mockResolvedValue(targetTag as never);

    const result = await mergeTags(USER_ID, {
      sourceIds: [SOURCE_ID],
      targetId: TARGET_ID,
    });

    expect(result.id).toBe(TARGET_ID);
  });

  it('throws BAD_REQUEST when sourceIds contains the targetId', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(targetTag as never);

    await expect(
      mergeTags(USER_ID, { sourceIds: [TARGET_ID], targetId: TARGET_ID }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('throws NOT_FOUND when target tag does not exist', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null);

    await expect(
      mergeTags(USER_ID, { sourceIds: [SOURCE_ID], targetId: TARGET_ID }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
