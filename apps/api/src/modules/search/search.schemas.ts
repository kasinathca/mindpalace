// ─────────────────────────────────────────────────────────────────────────────
// modules/search/search.schemas.ts — Zod validation for search queries
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(500).trim(),
  collectionId: z.string().cuid().optional(),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  isPinned: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  isFavourite: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  linkStatus: z.enum(['OK', 'BROKEN', 'UNCHECKED', 'REDIRECTED']).optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v, 10))))
    .default('24'),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
