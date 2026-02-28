// ─────────────────────────────────────────────────────────────────────────────
// modules/collections/collections.schemas.ts — Zod validation schemas
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const CreateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  description: z.string().max(500).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #6366F1)')
    .optional(),
  icon: z.string().max(64).optional(),
  parentId: z.string().cuid('Invalid parent collection ID').optional(),
  isPublic: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;

export const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
    .optional(),
  icon: z.string().max(64).optional(),
  parentId: z.string().cuid('Invalid parent collection ID').nullable().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;

export const ReorderCollectionSchema = z.object({
  sortOrder: z.number().int().min(0),
});

export type ReorderCollectionInput = z.infer<typeof ReorderCollectionSchema>;

/** Query param for DELETE /collections/:id — what to do with child bookmarks */
export const DeleteCollectionQuerySchema = z.object({
  action: z.enum(['move', 'delete']).default('delete'),
  targetCollectionId: z.string().cuid().optional(),
});

export type DeleteCollectionQuery = z.infer<typeof DeleteCollectionQuerySchema>;
