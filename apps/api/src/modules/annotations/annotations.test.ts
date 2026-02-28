// ─────────────────────────────────────────────────────────────────────────────
// modules/annotations/annotations.test.ts — Unit tests for AnnotationService
//
// Prisma is fully mocked; no real database required.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../middleware/errorHandler.middleware.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    bookmark: {
      findUnique: vi.fn(),
    },
    permanentCopy: {
      create: vi.fn(),
    },
    annotation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma.js';
import {
  listAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from './annotations.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user_01';
const OTHER_USER = 'user_99';
const BOOKMARK_ID = 'bm_01';
const COPY_ID = 'copy_01';
const ANN_ID = 'ann_01';
const NOW = new Date('2026-01-01T00:00:00.000Z');

const mockBookmarkWithCopy = {
  userId: USER_ID,
  permanentCopy: { id: COPY_ID },
};

const mockBookmarkNoCopy = {
  userId: USER_ID,
  permanentCopy: null,
};

const mockAnnotation = {
  id: ANN_ID,
  type: 'HIGHLIGHT',
  content: 'interesting passage',
  positionData: { startOffset: 10, endOffset: 30 },
  color: '#FDE047',
  isPublic: false,
  permanentCopyId: COPY_ID,
  userId: USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listAnnotations ───────────────────────────────────────────────────────────

describe('AnnotationService.listAnnotations', () => {
  it('returns empty array when bookmark has no permanent copy', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmarkNoCopy as never);

    const result = await listAnnotations(USER_ID, BOOKMARK_ID);

    expect(result).toEqual([]);
    expect(prisma.annotation.findMany).not.toHaveBeenCalled();
  });

  it('returns serialised annotations when permanent copy exists', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(mockBookmarkWithCopy as never);
    vi.mocked(prisma.annotation.findMany).mockResolvedValue([mockAnnotation] as never);

    const result = await listAnnotations(USER_ID, BOOKMARK_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: ANN_ID,
      type: 'HIGHLIGHT',
      content: 'interesting passage',
      color: '#FDE047',
      createdAt: NOW.toISOString(),
    });
  });

  it('throws NOT_FOUND when bookmark does not exist', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    await expect(listAnnotations(USER_ID, BOOKMARK_ID)).rejects.toBeInstanceOf(AppError);
  });

  it('throws NOT_FOUND when bookmark is owned by another user', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      userId: OTHER_USER,
      permanentCopy: null,
    } as never);

    await expect(listAnnotations(USER_ID, BOOKMARK_ID)).rejects.toBeInstanceOf(AppError);
  });
});

// ── createAnnotation ──────────────────────────────────────────────────────────

describe('AnnotationService.createAnnotation', () => {
  it('creates annotation on existing permanent copy', async () => {
    // resolvePermanentCopy needs findUnique with select including permanentCopy
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      id: BOOKMARK_ID,
      userId: USER_ID,
      permanentCopy: { id: COPY_ID },
    } as never);
    vi.mocked(prisma.annotation.create).mockResolvedValue(mockAnnotation as never);

    const result = await createAnnotation(USER_ID, BOOKMARK_ID, {
      type: 'HIGHLIGHT',
      content: 'interesting passage',
      isPublic: false,
    });

    expect(prisma.permanentCopy.create).not.toHaveBeenCalled();
    expect(prisma.annotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'HIGHLIGHT',
          content: 'interesting passage',
          permanentCopyId: COPY_ID,
          userId: USER_ID,
        }),
      }),
    );
    expect(result.id).toBe(ANN_ID);
  });

  it('creates a stub permanent copy when none exists, then creates annotation', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      id: BOOKMARK_ID,
      userId: USER_ID,
      permanentCopy: null,
    } as never);
    vi.mocked(prisma.permanentCopy.create).mockResolvedValue({ id: 'copy_new' } as never);
    vi.mocked(prisma.annotation.create).mockResolvedValue({
      ...mockAnnotation,
      permanentCopyId: 'copy_new',
    } as never);

    await createAnnotation(USER_ID, BOOKMARK_ID, {
      type: 'NOTE',
      content: 'my note',
      isPublic: false,
    });

    expect(prisma.permanentCopy.create).toHaveBeenCalledWith({
      data: { bookmarkId: BOOKMARK_ID },
    });
  });

  it('throws NOT_FOUND when bookmark not owned by user', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue({
      id: BOOKMARK_ID,
      userId: OTHER_USER,
      permanentCopy: null,
    } as never);

    await expect(
      createAnnotation(USER_ID, BOOKMARK_ID, { type: 'HIGHLIGHT', content: 'x', isPublic: false }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('throws NOT_FOUND when bookmark does not exist', async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(null);

    await expect(
      createAnnotation(USER_ID, BOOKMARK_ID, { type: 'HIGHLIGHT', content: 'x', isPublic: false }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ── updateAnnotation ──────────────────────────────────────────────────────────

describe('AnnotationService.updateAnnotation', () => {
  it('updates annotation fields', async () => {
    vi.mocked(prisma.annotation.findUnique).mockResolvedValue(mockAnnotation as never);
    const updatedAnnotation = { ...mockAnnotation, content: 'updated text' };
    vi.mocked(prisma.annotation.update).mockResolvedValue(updatedAnnotation as never);

    const result = await updateAnnotation(USER_ID, ANN_ID, { content: 'updated text' });

    expect(prisma.annotation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ANN_ID } }),
    );
    expect(result.content).toBe('updated text');
  });

  it('throws NOT_FOUND when annotation does not exist', async () => {
    vi.mocked(prisma.annotation.findUnique).mockResolvedValue(null);

    await expect(updateAnnotation(USER_ID, ANN_ID, { content: 'x' })).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('throws NOT_FOUND when annotation is owned by another user', async () => {
    vi.mocked(prisma.annotation.findUnique).mockResolvedValue({
      ...mockAnnotation,
      userId: OTHER_USER,
    } as never);

    await expect(updateAnnotation(USER_ID, ANN_ID, {})).rejects.toBeInstanceOf(AppError);
  });
});

// ── deleteAnnotation ──────────────────────────────────────────────────────────

describe('AnnotationService.deleteAnnotation', () => {
  it('deletes annotation when it exists and is owned', async () => {
    vi.mocked(prisma.annotation.findUnique).mockResolvedValue(mockAnnotation as never);
    vi.mocked(prisma.annotation.delete).mockResolvedValue(mockAnnotation as never);

    await deleteAnnotation(USER_ID, ANN_ID);

    expect(prisma.annotation.delete).toHaveBeenCalledWith({ where: { id: ANN_ID } });
  });

  it('throws NOT_FOUND when annotation does not exist', async () => {
    vi.mocked(prisma.annotation.findUnique).mockResolvedValue(null);

    await expect(deleteAnnotation(USER_ID, ANN_ID)).rejects.toBeInstanceOf(AppError);
  });

  it('throws NOT_FOUND when annotation is owned by another user', async () => {
    vi.mocked(prisma.annotation.findUnique).mockResolvedValue({
      ...mockAnnotation,
      userId: OTHER_USER,
    } as never);

    await expect(deleteAnnotation(USER_ID, ANN_ID)).rejects.toBeInstanceOf(AppError);
  });
});
