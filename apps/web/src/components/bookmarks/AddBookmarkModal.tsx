// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/AddBookmarkModal.tsx — Save URL dialog
//
// Flow:
//   1. User enters a URL (validated client-side with Zod)
//   2. On submit, createBookmark() is called → optimistic card appears instantly
//   3. Metadata fills in automatically (~1-3s) as the worker processes the job
//   4. Optional: collection, tags, notes, isPinned, isFavourite
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBookmarksStore } from '../../stores/bookmarksStore.js';
import { useCollectionsStore } from '../../stores/collectionsStore.js';
import { apiGetSimilarBookmarks } from '../../api/bookmarks.api.js';
import type { BookmarkItem } from '../../api/bookmarks.api.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import type { CollectionNode } from '../../api/collections.api.js';

// ── Form schema ───────────────────────────────────────────────────────────────

const addBookmarkSchema = z.object({
  url: z
    .string()
    .url('Enter a valid URL (starting with http:// or https://)')
    .refine(
      (u) => u.startsWith('http://') || u.startsWith('https://'),
      'URL must start with http:// or https://',
    ),
  collectionId: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  notes: z.string().max(10_000).optional(),
  isPinned: z.boolean().default(false),
  isFavourite: z.boolean().default(false),
});

type AddBookmarkFormValues = z.infer<typeof addBookmarkSchema>;

// ── Flatten collection tree for select dropdown ───────────────────────────────

function flattenTree(nodes: CollectionNode[], depth = 0): Array<{ id: string; label: string }> {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'  '.repeat(depth)}${n.name}` },
    ...flattenTree(n.children, depth + 1),
  ]);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AddBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCollectionId?: string;
}

export function AddBookmarkModal({
  open,
  onOpenChange,
  defaultCollectionId,
}: AddBookmarkModalProps): React.JSX.Element {
  const { createBookmark } = useBookmarksStore();
  const { tree } = useCollectionsStore();
  const flatCollections = flattenTree(tree);

  // Duplicate detection state
  const [similarBookmarks, setSimilarBookmarks] = useState<BookmarkItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddBookmarkFormValues>({
    resolver: zodResolver(addBookmarkSchema),
    defaultValues: {
      collectionId: defaultCollectionId ?? '',
      isPinned: false,
      isFavourite: false,
    },
  });

  const urlValue = watch('url');

  // Debounced duplicate check: fires 600 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSimilarBookmarks([]);

    if (!urlValue || !urlValue.startsWith('http')) return;

    debounceRef.current = setTimeout(() => {
      apiGetSimilarBookmarks(urlValue)
        .then((matches) => setSimilarBookmarks(matches))
        .catch(() => {
          /* ignore — non-critical */
        });
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [urlValue]);

  // Reset similar state when modal closes
  useEffect(() => {
    if (!open) setSimilarBookmarks([]);
  }, [open]);

  async function onSubmit(values: AddBookmarkFormValues): Promise<void> {
    const tags = values.tags
      ? values.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    await createBookmark({
      url: values.url,
      ...(values.collectionId ? { collectionId: values.collectionId } : {}),
      ...(tags.length ? { tags } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
      isPinned: values.isPinned,
      isFavourite: values.isFavourite,
    });

    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Bookmark</DialogTitle>
          <DialogDescription>
            Paste a URL to save it. Title and description are fetched automatically.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bm-url">URL *</Label>
            <Input
              id="bm-url"
              type="url"
              placeholder="https://example.com/article"
              autoFocus
              {...register('url')}
              aria-invalid={!!errors.url}
            />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>

          {/* Duplicate warning */}
          {similarBookmarks.length > 0 && (
            <div
              role="alert"
              className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <p className="font-semibold">You’ve already saved this URL:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {similarBookmarks.slice(0, 3).map((b) => (
                  <li key={b.id} className="truncate">
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {b.title || b.url}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                You can still save it again if you want.
              </p>
            </div>
          )}

          {/* Collection */}
          {flatCollections.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bm-collection">Collection</Label>
              <select
                id="bm-collection"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('collectionId')}
              >
                <option value="">No collection</option>
                {flatCollections.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bm-tags">Tags</Label>
            <Input
              id="bm-tags"
              type="text"
              placeholder="react, typescript, tools  (comma-separated)"
              {...register('tags')}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bm-notes">Notes</Label>
            <textarea
              id="bm-notes"
              rows={3}
              placeholder="Private notes about this link…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('notes')}
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" {...register('isPinned')} className="rounded border-input" />
              Pin to top
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('isFavourite')}
                className="rounded border-input"
              />
              Favourite
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Bookmark'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
