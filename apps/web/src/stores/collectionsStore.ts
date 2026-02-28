// ─────────────────────────────────────────────────────────────────────────────
// stores/collectionsStore.ts — Zustand collections state store
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import {
  apiGetCollectionTree,
  apiCreateCollection,
  apiUpdateCollection,
  apiDeleteCollection,
  type CollectionNode,
  type CreateCollectionParams,
  type UpdateCollectionParams,
} from '../api/collections.api.js';

interface CollectionsState {
  tree: CollectionNode[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CollectionsActions {
  fetchTree: () => Promise<void>;
  createCollection: (input: CreateCollectionParams) => Promise<CollectionNode>;
  updateCollection: (id: string, input: UpdateCollectionParams) => Promise<void>;
  deleteCollection: (
    id: string,
    action?: 'move' | 'delete',
    targetCollectionId?: string,
  ) => Promise<void>;
  selectCollection: (id: string | null) => void;
  clearError: () => void;
}

type CollectionsStore = CollectionsState & CollectionsActions;

export const useCollectionsStore = create<CollectionsStore>((set, get) => ({
  tree: [],
  selectedId: null,
  isLoading: false,
  error: null,

  fetchTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const tree = await apiGetCollectionTree();
      set({ tree, isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load collections.',
      });
    }
  },

  createCollection: async (input) => {
    try {
      const created = await apiCreateCollection(input);
      // Refetch tree to get correct nesting
      await get().fetchTree();
      return created;
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to create collection.' });
      throw err;
    }
  },

  updateCollection: async (id, input) => {
    try {
      await apiUpdateCollection(id, input);
      await get().fetchTree();
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to update collection.' });
      throw err;
    }
  },

  deleteCollection: async (id, action = 'delete', targetCollectionId) => {
    try {
      await apiDeleteCollection(id, action, targetCollectionId);
      // If deleted collection is selected, deselect
      if (get().selectedId === id) set({ selectedId: null });
      await get().fetchTree();
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete collection.' });
      throw err;
    }
  },

  selectCollection: (id) => set({ selectedId: id }),
  clearError: () => set({ error: null }),
}));
