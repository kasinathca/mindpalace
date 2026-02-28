// ─────────────────────────────────────────────────────────────────────────────
// modules/bookmarks/bookmarks.test.ts — Unit tests for BookmarkService
//
// All external dependencies (Prisma, BullMQ queues) are mocked so these
// tests run without a database or Redis instance.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../middleware/errorHandler.middleware.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    bookmark: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    collection: {
      findUnique: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../workers/queues.js', () => ({
  metadataQueue: {
    add: vi.fn().mockResolvedValue(undefined),
  },
  archiveQueue: {
    add: vi.fn().mockResolvedValue(undefined),
  },
  linkHealthQueue: {
    add: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from '../../lib/prisma.js';
import {
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  batchDeleteBookmarks,
} from './bookmarks.service.js';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const USER_ID = 'user_01';
const BOOKMARK_ID = 'bm_01';

const mockBookmark = {
  id: BOOKMARK_ID,
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: null,
  coverImageUrl: null,
  notes: null,
  isPublic: false,
  isPinned: false,
  isFavourite: false,
  linkStatus: 'UNCHECKED',
  lastCheckedAt: null,
  readAt: null,
  userId: USER_ID,
  collectionId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getBookmark ───────────────────────────────────────────────────────────────

describe('BookmarkService.getBookmark', () => {
  it('returns the bookmark when found and owned by user', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmark as never);

    const result = await getBookmark(USER_ID, BOOKMARK_ID);

    expect(result.id).toBe(BOOKMARK_ID);
    expect(result.url).toBe('https://example.com');
  });

  it('throws NOT_FOUND when bookmark does not exist', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    await expect(getBookmark(USER_ID, BOOKMARK_ID)).rejects.toBeInstanceOf(AppError);
  });

  it('throws NOT_FOUND when bookmark belongs to a different user', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      ...mockBookmark,
      userId: 'other_user',
    } as never);

    await expect(getBookmark(USER_ID, BOOKMARK_ID)).rejects.toBeInstanceOf(AppError);
  });
});

// ── createBookmark ────────────────────────────────────────────────────────────

describe('BookmarkService.createBookmark', () => {
  it('creates a bookmark with no tags and enqueues metadata job', async () => {
    vi.mocked(prisma.bookmark.create).mockResolvedValue(mockBookmark as never);

    const result = await createBookmark(USER_ID, {
      url: 'https://example.com',
      tags: [] as string[],
      isPublic: false,
      isPinned: false,
      isFavourite: false,
    });

    expect(result.url).toBe('https://example.com');
    // metadataQueue.add is called
    const { metadataQueue } = await import('../../workers/queues.js');
    expect(metadataQueue.add).toHaveBeenCalledWith('extract', {
      bookmarkId: BOOKMARK_ID,
      url: 'https://example.com',
    });
  });

  it('creates tags via upsert before creating bookmark', async () => {
    vi.mocked(prisma.tag.upsert).mockResolvedValue({ id: 'tag_01' } as never);
    vi.mocked(prisma.bookmark.create).mockResolvedValue(mockBookmark as never);

    await createBookmark(USER_ID, {
      url: 'https://example.com',
      tags: ['react', 'typescript'],
      isPublic: false,
      isPinned: false,
      isFavourite: false,
    });

    expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
  });

  it('throws NOT_FOUND when collectionId does not exist', async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

    await expect(
      createBookmark(USER_ID, {
        url: 'https://example.com',
        tags: [] as string[],
        collectionId: 'nonexistent',
        isPublic: false,
        isPinned: false,
        isFavourite: false,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ── updateBookmark ────────────────────────────────────────────────────────────

describe('BookmarkService.updateBookmark', () => {
  it('updates the bookmark title', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmark as never);
    vi.mocked(prisma.bookmark.update).mockResolvedValue({
      ...mockBookmark,
      title: 'New Title',
    } as never);

    const result = await updateBookmark(USER_ID, BOOKMARK_ID, { title: 'New Title' });

    expect(result.title).toBe('New Title');
  });

  it('throws NOT_FOUND when bookmark not found', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    await expect(updateBookmark(USER_ID, BOOKMARK_ID, { title: 'X' })).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

// ── deleteBookmark ────────────────────────────────────────────────────────────

describe('BookmarkService.deleteBookmark', () => {
  it('deletes an owned bookmark', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmark as never);
    vi.mocked(prisma.bookmark.delete).mockResolvedValue(mockBookmark as never);

    await expect(deleteBookmark(USER_ID, BOOKMARK_ID)).resolves.toBeUndefined();
    expect(prisma.bookmark.delete).toHaveBeenCalledWith({ where: { id: BOOKMARK_ID } });
  });

  it('throws NOT_FOUND for foreign bookmark', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    await expect(deleteBookmark(USER_ID, BOOKMARK_ID)).rejects.toBeInstanceOf(AppError);
  });
});

// ── batchDeleteBookmarks ──────────────────────────────────────────────────────

describe('BookmarkService.batchDeleteBookmarks', () => {
  it('returns the count of deleted bookmarks', async () => {
    vi.mocked(prisma.bookmark.deleteMany).mockResolvedValue({ count: 3 });

    const count = await batchDeleteBookmarks(USER_ID, ['a', 'b', 'c']);

    expect(count).toBe(3);
    expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b', 'c'] }, userId: USER_ID },
    });
  });
});
