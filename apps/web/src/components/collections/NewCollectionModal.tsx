// ─────────────────────────────────────────────────────────────────────────────
// components/collections/NewCollectionModal.tsx — Create new collection
//
// Opens a Dialog for naming (and optionally configuring) a new collection.
// Optionally receives a parentId to create a nested child collection.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { InlineNotice } from '../common/InlineNotice.js';
import { useCollectionsStore } from '../../stores/collectionsStore.js';

// ── Form schema ───────────────────────────────────────────────────────────────
const newCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().trim().max(500, 'Max 500 characters').optional(),
  color: z.string().optional(),
  icon: z.string().trim().max(10, 'Max 10 characters').optional(),
});

type NewCollectionValues = z.infer<typeof newCollectionSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────
interface NewCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, creates this collection as a child of the given collection. */
  parentId?: string;
  /** Called with the id of the newly created collection after success. */
  onCreated?: (id: string) => void;
}

// Colour swatches for quick selection
const COLOUR_SWATCHES = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#64748b', // slate
];

// ── Component ─────────────────────────────────────────────────────────────────
export function NewCollectionModal({
  open,
  onOpenChange,
  parentId,
  onCreated,
}: NewCollectionModalProps): React.JSX.Element {
  const createCollection = useCollectionsStore((s) => s.createCollection);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewCollectionValues>({
    resolver: zodResolver(newCollectionSchema),
    defaultValues: { name: '', description: '', color: COLOUR_SWATCHES[0], icon: '' },
  });

  const selectedColor = watch('color');

  function handleClose(): void {
    reset();
    onOpenChange(false);
  }

  const onSubmit = handleSubmit(async (values: NewCollectionValues) => {
    const created = await createCollection({
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
      ...(values.color ? { color: values.color } : {}),
      ...(values.icon ? { icon: values.icon } : {}),
      ...(parentId ? { parentId } : {}),
    });
    onCreated?.(created.id);
    handleClose();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parentId ? 'New Sub-Collection' : 'New Collection'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="col-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="col-name"
              {...register('name')}
              placeholder="e.g. Research, Recipes, Reading List"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.name && (
              <InlineNotice
                message={errors.name.message ?? 'Collection name is required.'}
                variant="error"
                size="compact"
              />
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="col-description" className="text-sm font-medium">
              Description <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="col-description"
              {...register('description')}
              rows={2}
              placeholder="What will you save here?"
              className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.description && (
              <InlineNotice
                message={errors.description.message ?? 'Description is too long.'}
                variant="error"
                size="compact"
              />
            )}
          </div>

          {/* Colour swatches */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Colour</span>
            <div className="flex flex-wrap gap-2">
              {COLOUR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setValue('color', hex)}
                  aria-label={`Select colour ${hex}`}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selectedColor === hex ? 'ring-2 ring-ring ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              {/* Custom hex input */}
              <label className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-xs text-muted-foreground">
                <span>+</span>
                <input
                  type="color"
                  value={selectedColor ?? '#6366f1'}
                  onChange={(e) => setValue('color', e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          {/* Icon (emoji) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="col-icon" className="text-sm font-medium">
              Icon <span className="text-xs text-muted-foreground">(emoji, optional)</span>
            </label>
            <input
              id="col-icon"
              {...register('icon')}
              placeholder="e.g. 📚 🔖 🌍"
              maxLength={10}
              className="w-24 rounded-md border border-input bg-background px-3 py-2 text-center text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.icon && (
              <InlineNotice
                message={errors.icon.message ?? 'Icon value is not valid.'}
                variant="error"
                size="compact"
              />
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
