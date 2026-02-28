// ─────────────────────────────────────────────────────────────────────────────
// modules/annotations/annotations.schemas.ts — Zod validation schemas
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// Position data: CSS/XPath-based range for text highlights
const PositionDataSchema = z
  .object({
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    selector: z.string().max(2000).optional(), // CSS or XPath selector
    xpath: z.string().max(2000).optional(),
  })
  .optional();

export const CreateAnnotationSchema = z.object({
  type: z.enum(['HIGHLIGHT', 'NOTE', 'BOOKMARK_WITHIN_PAGE']).default('HIGHLIGHT'),
  content: z
    .string()
    .min(1, 'Annotation content is required')
    .max(20_000, 'Annotation content must not exceed 20 000 characters'),
  positionData: PositionDataSchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #FDE047)')
    .optional(),
  isPublic: z.boolean().default(false),
});

export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>;

export const UpdateAnnotationSchema = z.object({
  content: z.string().min(1).max(20_000).optional(),
  positionData: PositionDataSchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code')
    .nullable()
    .optional(),
  isPublic: z.boolean().optional(),
});

export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationSchema>;
