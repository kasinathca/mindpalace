// ─────────────────────────────────────────────────────────────────────────────
// modules/tags/tags.schemas.ts — Zod validation schemas for tags
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const CreateTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(64, 'Tag name must not exceed 64 characters')
    .trim()
    .transform((v) => v.toLowerCase()), // normalise to lowercase
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #6366F1)')
    .optional(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .trim()
    .transform((v) => v.toLowerCase())
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
    .nullable()
    .optional(),
});

export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;

export const MergeTagsSchema = z.object({
  sourceIds: z
    .array(z.string().cuid('Invalid tag ID'))
    .min(1, 'At least one source tag is required')
    .max(20),
  targetId: z.string().cuid('Invalid target tag ID'),
});

export type MergeTagsInput = z.infer<typeof MergeTagsSchema>;
