// ─────────────────────────────────────────────────────────────────────────────
// modules/bookmarks/bookmarks.schemas.ts — Zod validation schemas
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const CreateBookmarkSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .max(2048, 'URL exceeds maximum length')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must use http or https',
    ),
  collectionId: z.string().cuid('Invalid collection ID').optional(),
  title: z.string().max(500).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  notes: z.string().max(10_000).trim().optional(),
  tags: z.array(z.string().max(64).trim()).max(20).default([]),
  isPublic: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  isFavourite: z.boolean().default(false),
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;

export const UpdateBookmarkSchema = z.object({
  title: z.string().max(500).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  notes: z.string().max(10_000).trim().optional(),
  collectionId: z.string().cuid().nullable().optional(),
  isPublic: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isFavourite: z.boolean().optional(),
  tags: z.array(z.string().max(64).trim()).max(20).optional(),
  readAt: z.string().datetime().nullable().optional(),
});

export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;

export const ListBookmarksQuerySchema = z.object({
  collectionId: z.string().cuid().optional(),
  isPinned: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  isFavourite: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  isUnread: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  tagIds: z.union([z.string(), z.array(z.string())]).optional(),
  linkStatus: z.enum(['OK', 'BROKEN', 'UNCHECKED', 'REDIRECTED']).optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v, 10))))
    .default('24'),
  sortBy: z.enum(['createdAt', 'title', 'url']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListBookmarksQuery = z.infer<typeof ListBookmarksQuerySchema>;

export const BatchDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export type BatchDeleteInput = z.infer<typeof BatchDeleteSchema>;

export const BatchMoveSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  collectionId: z.string().cuid('Invalid collection ID').nullable(),
});

export type BatchMoveInput = z.infer<typeof BatchMoveSchema>;

export const BatchTagSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  tagIds: z.array(z.string().cuid()).min(1).max(20),
  mode: z.enum(['add', 'remove', 'replace']),
});

export type BatchTagInput = z.infer<typeof BatchTagSchema>;
