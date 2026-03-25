// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/EditBookmarkModal.tsx — Edit an existing bookmark
//
// Loads current bookmark values as form defaults. On save, calls
// updateBookmark() from the store, which patches the API and refreshes.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBookmarksStore } from '../../stores/bookmarksStore.js';
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
import { InlineNotice } from '../common/InlineNotice.js';
import { TagAutocompleteInput } from './TagAutocompleteInput.js';
import type { BookmarkItem } from '../../api/bookmarks.api.js';

// ── Form schema ───────────────────────────────────────────────────────────────

const editBookmarkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  notes: z.string().max(10_000).optional(),
  isPinned: z.boolean(),
  isFavourite: z.boolean(),
  isPublic: z.boolean(),
});

type EditBookmarkFormValues = z.infer<typeof editBookmarkSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

interface EditBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmark: BookmarkItem;
  onSaved?: (updated: BookmarkItem) => void;
}

export function EditBookmarkModal({
  open,
  onOpenChange,
  bookmark,
  onSaved,
}: EditBookmarkModalProps): React.JSX.Element {
  const { updateBookmark } = useBookmarksStore();
  const [selectedTags, setSelectedTags] = React.useState<string[]>(
    bookmark.tags.map((t) => t.name),
  );

  React.useEffect(() => {
    setSelectedTags(bookmark.tags.map((t) => t.name));
  }, [bookmark.id, bookmark.tags]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditBookmarkFormValues>({
    resolver: zodResolver(editBookmarkSchema),
    defaultValues: {
      title: bookmark.title,
      description: bookmark.description ?? '',
      notes: bookmark.notes ?? '',
      isPinned: bookmark.isPinned,
      isFavourite: bookmark.isFavourite,
      isPublic: bookmark.isPublic,
    },
  });

  async function onSubmit(values: EditBookmarkFormValues): Promise<void> {
    await updateBookmark(bookmark.id, {
      title: values.title,
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.notes !== undefined ? { notes: values.notes } : {}),
      tags: selectedTags,
      isPinned: values.isPinned,
      isFavourite: values.isFavourite,
      isPublic: values.isPublic,
    });

    onSaved?.({ ...bookmark, title: values.title });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
          <DialogDescription>
            Update the title, description, notes, or tags for this bookmark.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              type="text"
              placeholder="Bookmark title"
              {...register('title')}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <InlineNotice
                message={errors.title.message ?? 'Title is required.'}
                variant="error"
                size="compact"
              />
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              type="text"
              placeholder="Short description"
              {...register('description')}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <textarea
              id="edit-notes"
              rows={3}
              placeholder="Private notes about this bookmark"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('notes')}
            />
          </div>

          {/* Tags */}
          <TagAutocompleteInput
            id="edit-tags"
            label="Tags"
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            disabled={isSubmitting}
          />

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...register('isPinned')} />
              Pinned
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...register('isFavourite')} />
              Favourite
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...register('isPublic')} />
              Public
            </label>
          </div>

          {/* URL (read-only reference) */}
          <p className="truncate text-xs text-muted-foreground" title={bookmark.url}>
            {bookmark.url}
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
