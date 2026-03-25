// ─────────────────────────────────────────────────────────────────────────────
// stores/collectionsStore.ts — Zustand collections state store
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import {
  apiGetCollectionTree,
  apiCreateCollection,
  apiUpdateCollection,
  apiDeleteCollection,
  type DeleteCollectionResult,
  type CollectionNode,
  type CreateCollectionParams,
  type UpdateCollectionParams,
} from '../api/collections.api.js';
import { getUserFriendlyErrorMessage } from '../utils/apiError.js';

function collectionExists(nodes: CollectionNode[], id: string): boolean {
  for (const node of nodes) {
    if (node.id === id) return true;
    if (collectionExists(node.children, id)) return true;
  }
  return false;
}

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
  ) => Promise<DeleteCollectionResult>;
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
        error: getUserFriendlyErrorMessage(err, 'Failed to load collections.'),
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
      set({ error: getUserFriendlyErrorMessage(err, 'Failed to create collection.') });
      throw err;
    }
  },

  updateCollection: async (id, input) => {
    try {
      await apiUpdateCollection(id, input);
      await get().fetchTree();
    } catch (err: unknown) {
      set({ error: getUserFriendlyErrorMessage(err, 'Failed to update collection.') });
      throw err;
    }
  },

  deleteCollection: async (id, action = 'delete', targetCollectionId) => {
    try {
      const result = await apiDeleteCollection(id, action, targetCollectionId);
      await get().fetchTree();

      const selectedId = get().selectedId;
      if (selectedId && !collectionExists(get().tree, selectedId)) {
        set({ selectedId: null });
      }
      return result;
    } catch (err: unknown) {
      set({ error: getUserFriendlyErrorMessage(err, 'Failed to delete collection.') });
      throw err;
    }
  },

  selectCollection: (id) => set({ selectedId: id }),
  clearError: () => set({ error: null }),
}));
