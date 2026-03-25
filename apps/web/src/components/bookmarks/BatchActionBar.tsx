// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/BatchActionBar.tsx — Floating bar for multi-select ops
//
// Appears at the bottom of the viewport when ≥1 bookmark is selected.
// Actions: move to collection, add/remove tags, delete selected.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useBookmarksStore } from '../../stores/bookmarksStore.js';
import { useCollectionsStore } from '../../stores/collectionsStore.js';
import { useTagsStore } from '../../stores/tagsStore.js';
import {
  apiBatchDeleteBookmarks,
  apiBatchMoveBookmarks,
  apiBatchTagBookmarks,
} from '../../api/bookmarks.api.js';

interface BatchActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BatchActionBar({
  selectedIds,
  onClearSelection,
}: BatchActionBarProps): React.JSX.Element | null {
  const { fetchBookmarks } = useBookmarksStore();
  const { tree, fetchTree } = useCollectionsStore();
  const { tags } = useTagsStore();

  // Flatten collection tree for the move menu
  const collections = React.useMemo(() => {
    const flat: { id: string; name: string }[] = [];
    function flattenNode(nodes: typeof tree): void {
      for (const node of nodes) {
        flat.push({ id: node.id, name: node.name });
        if (node.children) flattenNode(node.children);
      }
    }
    flattenNode(tree);
    return flat;
  }, [tree]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  if (selectedIds.length === 0) return null;

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`Delete ${selectedIds.length} bookmark(s)? This cannot be undone.`)) return;
    setIsLoading(true);
    try {
      await apiBatchDeleteBookmarks(selectedIds);
      await fetchBookmarks({});
      await fetchTree();
      onClearSelection();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMove(collectionId: string | null): Promise<void> {
    setIsLoading(true);
    try {
      await apiBatchMoveBookmarks(selectedIds, collectionId);
      await fetchBookmarks({});
      await fetchTree();
      onClearSelection();
    } finally {
      setIsLoading(false);
      setShowMoveMenu(false);
    }
  }

  async function handleTag(tagId: string, mode: 'add' | 'remove'): Promise<void> {
    setIsLoading(true);
    try {
      await apiBatchTagBookmarks(selectedIds, [tagId], mode);
      await fetchBookmarks({});
    } finally {
      setIsLoading(false);
      setShowTagMenu(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-card px-4 py-3 shadow-xl ring-1 ring-border">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Move to collection */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowMoveMenu((v) => !v);
            setShowTagMenu(false);
          }}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
          disabled={isLoading}
        >
          Move
        </button>
        {showMoveMenu && (
          <div className="absolute bottom-full mb-1 w-56 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-border">
            <button
              type="button"
              onClick={() => void handleMove(null)}
              className="w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent"
            >
              Uncollected
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => void handleMove(col.id)}
                className="w-full truncate rounded px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                {col.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tag operations */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowTagMenu((v) => !v);
            setShowMoveMenu(false);
          }}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
          disabled={isLoading}
        >
          Tag
        </button>
        {showTagMenu && (
          <div className="absolute bottom-full mb-1 w-56 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-border">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleTag(tag.id, 'add')}
                  className="flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-accent"
                >
                  + {tag.name}
                </button>
                <button
                  type="button"
                  onClick={() => void handleTag(tag.id, 'remove')}
                  className="rounded px-1 py-1 text-xs text-muted-foreground hover:bg-accent"
                  title={`Remove tag "${tag.name}"`}
                >
                  ✕
                </button>
              </div>
            ))}
            {tags.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No tags yet</p>
            )}
          </div>
        )}
      </div>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Delete */}
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isLoading}
        className="rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
      >
        Delete
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={onClearSelection}
        className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-accent"
        aria-label="Clear selection"
      >
        ✕
      </button>
    </div>
  );
}
