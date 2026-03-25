import React, { useMemo, useState } from 'react';
import type { CollectionNode } from '../../api/collections.api.js';
import { useCollectionsStore } from '../../stores/collectionsStore.js';
import { useUiStore } from '../../stores/uiStore.js';
import { useBookmarksStore } from '../../stores/bookmarksStore.js';
import { apiBatchMoveBookmarks } from '../../api/bookmarks.api.js';
import { getUserFriendlyErrorMessage } from '../../utils/apiError.js';
import { Button } from '../ui/button.js';
import { InlineNotice } from '../common/InlineNotice.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';

type DeleteMode = 'move' | 'delete';

interface DeleteCollectionDialogProps {
  open: boolean;
  collection: CollectionNode | null;
  onOpenChange: (open: boolean) => void;
}

interface ImpactSummary {
  collectionCount: number;
  bookmarkCount: number;
  subtreeIds: Set<string>;
}

interface MoveTargetOption {
  id: string;
  name: string;
  depth: number;
}

const MAX_BATCH_MOVE_SIZE = 100;

async function moveBookmarksInBatches(ids: string[], collectionId: string): Promise<void> {
  for (let i = 0; i < ids.length; i += MAX_BATCH_MOVE_SIZE) {
    const chunk = ids.slice(i, i + MAX_BATCH_MOVE_SIZE);
    if (chunk.length === 0) continue;
    await apiBatchMoveBookmarks(chunk, collectionId);
  }
}

function buildRecoveryCollectionName(baseName: string): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const raw = `Recovered - ${baseName} - ${stamp}`;
  return raw.slice(0, 100);
}

function summarizeSubtree(node: CollectionNode): ImpactSummary {
  const subtreeIds = new Set<string>();
  let collectionCount = 0;
  let bookmarkCount = 0;

  const stack: CollectionNode[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    subtreeIds.add(current.id);
    collectionCount += 1;
    bookmarkCount += current._count.bookmarks;
    for (const child of current.children) {
      stack.push(child);
    }
  }

  return { collectionCount, bookmarkCount, subtreeIds };
}

function flattenCollections(nodes: CollectionNode[], depth = 0): MoveTargetOption[] {
  const flat: MoveTargetOption[] = [];
  for (const node of nodes) {
    flat.push({ id: node.id, name: node.name, depth });
    flat.push(...flattenCollections(node.children, depth + 1));
  }
  return flat;
}

export function DeleteCollectionDialog({
  open,
  collection,
  onOpenChange,
}: DeleteCollectionDialogProps): React.JSX.Element {
  const tree = useCollectionsStore((s) => s.tree);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);
  const addToast = useUiStore((s) => s.addToast);

  const [mode, setMode] = useState<DeleteMode>('delete');
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const impact = useMemo(() => {
    if (!collection) return null;
    return summarizeSubtree(collection);
  }, [collection]);

  const moveTargets = useMemo(() => {
    if (!impact) return [];
    return flattenCollections(tree).filter((item) => !impact.subtreeIds.has(item.id));
  }, [impact, tree]);

  const mustMove = impact ? impact.bookmarkCount > 0 && moveTargets.length > 0 : false;

  React.useEffect(() => {
    if (!open || !collection) return;
    setError(null);
    setConfirmText('');
    setTargetCollectionId(moveTargets[0]?.id ?? '');
    setMode(mustMove ? 'move' : 'delete');
  }, [open, collection, mustMove, moveTargets]);

  const nameMatches = collection ? confirmText.trim() === collection.name : false;

  async function handleConfirm(): Promise<void> {
    if (!collection || !impact) return;

    if (!nameMatches) {
      setError('Please type the collection name exactly to confirm.');
      return;
    }

    if (mode === 'move' && !targetCollectionId) {
      setError('Select a target collection to move bookmarks.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await deleteCollection(
        collection.id,
        mode,
        mode === 'move' ? targetCollectionId : undefined,
      );

      if (result.action === 'move') {
        const movedIds = result.movedBookmarkIds ?? [];
        addToast({
          title: 'Collection deleted',
          description: `${result.affectedBookmarkCount} bookmarks moved successfully.`,
          variant: 'success',
          duration: 9000,
          ...(movedIds.length > 0
            ? {
                actionLabel: 'Undo',
                onAction: async () => {
                  try {
                    const recovery = await createCollection({
                      name: buildRecoveryCollectionName(collection.name),
                    });
                    await moveBookmarksInBatches(movedIds, recovery.id);
                    await useCollectionsStore.getState().fetchTree();

                    const bookmarksStore = useBookmarksStore.getState();
                    await bookmarksStore.fetchBookmarks(bookmarksStore.filters, true);

                    addToast({
                      title: 'Undo complete',
                      description: `${movedIds.length} bookmarks restored to ${recovery.name}.`,
                      variant: 'success',
                    });
                  } catch (undoErr) {
                    addToast({
                      title: 'Undo failed',
                      description: getUserFriendlyErrorMessage(
                        undoErr,
                        'Could not restore moved bookmarks.',
                      ),
                      variant: 'error',
                    });
                  }
                },
                showActionCountdown: true,
              }
            : {}),
        });
      } else {
        addToast({
          title: 'Collection deleted permanently',
          description: `${result.affectedBookmarkCount} bookmarks were removed.`,
          variant: 'warning',
        });
      }

      onOpenChange(false);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'Failed to delete collection.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete Collection</DialogTitle>
          <DialogDescription>
            This removes {impact?.collectionCount ?? 0} collection
            {(impact?.collectionCount ?? 0) === 1 ? '' : 's'} from your sidebar hierarchy.
          </DialogDescription>
        </DialogHeader>

        {collection && impact && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p>
                <span className="font-medium">Collection:</span> {collection.name}
              </p>
              <p className="mt-1 text-muted-foreground">
                Affected bookmarks in this collection tree: {impact.bookmarkCount}
              </p>
            </div>

            {mustMove && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                No-safe-delete guard: this collection tree contains bookmarks and another collection
                is available. Choose where to move bookmarks before deletion.
              </p>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">What should happen to bookmarks?</legend>

              <label className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
                <input
                  type="radio"
                  name="delete-mode"
                  value="move"
                  checked={mode === 'move'}
                  onChange={() => setMode('move')}
                  disabled={moveTargets.length === 0}
                  className="mt-0.5"
                />
                <span>
                  Move bookmarks to another collection
                  {moveTargets.length === 0 && (
                    <span className="block text-xs text-muted-foreground">
                      No target collection available.
                    </span>
                  )}
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
                <input
                  type="radio"
                  name="delete-mode"
                  value="delete"
                  checked={mode === 'delete'}
                  onChange={() => setMode('delete')}
                  className="mt-0.5"
                />
                <span>Permanently delete bookmarks in this collection tree</span>
              </label>
            </fieldset>

            {mode === 'move' && (
              <div className="space-y-1.5">
                <label htmlFor="move-target" className="text-sm font-medium">
                  Move to
                </label>
                <select
                  id="move-target"
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {moveTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {'  '.repeat(target.depth)}
                      {target.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="confirm-name" className="text-sm font-medium">
                Type <span className="font-semibold">{collection.name}</span> to confirm
              </label>
              <input
                id="confirm-name"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={collection.name}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && <InlineNotice message={error} variant="error" />}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting || !nameMatches || (mode === 'move' && !targetCollectionId)}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? 'Deleting…' : 'Delete Collection Tree'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
