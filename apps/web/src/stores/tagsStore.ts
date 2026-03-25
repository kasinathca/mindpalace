// ─────────────────────────────────────────────────────────────────────────────
// stores/tagsStore.ts — Zustand store for tag management
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import {
  apiListTags,
  apiCreateTag,
  apiUpdateTag,
  apiDeleteTag,
  apiMergeTags,
  type TagItem,
  type CreateTagParams,
  type UpdateTagParams,
  type MergeTagsParams,
} from '../api/tags.api.js';
import { getUserFriendlyErrorMessage } from '../utils/apiError.js';

interface TagsState {
  tags: TagItem[];
  isLoading: boolean;
  error: string | null;

  fetchTags: () => Promise<void>;
  createTag: (params: CreateTagParams) => Promise<TagItem>;
  updateTag: (id: string, params: UpdateTagParams) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  mergeTags: (params: MergeTagsParams) => Promise<void>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await apiListTags();
      set({ tags, isLoading: false });
    } catch (err) {
      const message = getUserFriendlyErrorMessage(err, 'Failed to load tags.');
      set({ error: message, isLoading: false });
    }
  },

  createTag: async (params) => {
    const tag = await apiCreateTag(params);
    set((state) => ({ tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
    return tag;
  },

  updateTag: async (id, params) => {
    const updated = await apiUpdateTag(id, params);
    set((state) => ({
      tags: state.tags
        .map((t) => (t.id === id ? updated : t))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  deleteTag: async (id) => {
    await apiDeleteTag(id);
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }));
  },

  mergeTags: async (params) => {
    await apiMergeTags(params);
    // Refresh the full list after merge (counts change, sources disappear)
    await get().fetchTags();
  },
}));
