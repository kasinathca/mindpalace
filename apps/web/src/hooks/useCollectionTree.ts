// ─────────────────────────────────────────────────────────────────────────────
// hooks/useCollectionTree.ts — Load and cache the collection tree
//
// Fetches the full nested collection tree for the authenticated user once and
// caches it in the global collectionsStore. Exposes loading state.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useCollectionsStore } from '../stores/collectionsStore.js';
import type { CollectionNode } from '../api/collections.api.js';

export interface UseCollectionTreeResult {
  tree: CollectionNode[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  selectCollection: (id: string | null) => void;
  refresh: () => Promise<void>;
}

/**
 * Provides the collection tree and selection state. The tree is fetched once
 * on first use; subsequent calls share the cached result.
 */
export function useCollectionTree(): UseCollectionTreeResult {
  const { tree, selectedId, isLoading, error, fetchTree, selectCollection } = useCollectionsStore();

  useEffect(() => {
    if (tree.length === 0 && !isLoading && !error) {
      void fetchTree();
    }
  }, [tree.length, isLoading, error, fetchTree]);

  return {
    tree,
    selectedId,
    isLoading,
    error,
    selectCollection: selectCollection,
    refresh: fetchTree,
  };
}
