// ─────────────────────────────────────────────────────────────────────────────
// modules/search/search.test.ts — Unit tests for SearchService
//
// Prisma $queryRaw and findMany are mocked so no real DB is needed.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    bookmark: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma.js';
import { searchBookmarks } from './search.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user_01';

const mockRankedRows = [
  { id: 'bm_01', rank: 0.9 },
  { id: 'bm_02', rank: 0.5 },
];

const mockBookmarks = [
  {
    id: 'bm_01',
    url: 'https://react.dev',
    title: 'React',
    description: 'The library for web',
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
  },
  {
    id: 'bm_02',
    url: 'https://reactrouter.com',
    title: 'React Router',
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
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
    tags: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── searchBookmarks ───────────────────────────────────────────────────────────

describe('SearchService.searchBookmarks', () => {
  it('returns ranked bookmarks for a basic query', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(mockRankedRows) // ranked IDs
      .mockResolvedValueOnce([{ total: BigInt(2) }]); // count
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue(mockBookmarks as never);

    const result = await searchBookmarks(USER_ID, {
      q: 'react',
      limit: 24,
    });

    expect(result.bookmarks).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.query).toBe('react');
    // highest rank comes first
    expect(result.bookmarks[0]?.id).toBe('bm_01');
  });

  it('returns empty results when no bookmarks match', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([]) // no ranked rows
      .mockResolvedValueOnce([{ total: BigInt(0) }]); // count

    const result = await searchBookmarks(USER_ID, {
      q: 'nonexistent term xyz',
      limit: 24,
    });

    expect(result.bookmarks).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('honours the limit parameter', async () => {
    const twoRows = mockRankedRows.slice(0, 1);
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(twoRows)
      .mockResolvedValueOnce([{ total: BigInt(10) }]);
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue([mockBookmarks[0]!] as never);

    const result = await searchBookmarks(USER_ID, { q: 'react', limit: 1 });

    expect(result.bookmarks).toHaveLength(1);
    expect(result.total).toBe(10);
  });

  it('serialises dates to ISO strings', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(mockRankedRows)
      .mockResolvedValueOnce([{ total: BigInt(2) }]);
    vi.mocked(prisma.bookmark.findMany).mockResolvedValue(mockBookmarks as never);

    const result = await searchBookmarks(USER_ID, { q: 'react', limit: 24 });

    expect(result.bookmarks[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
