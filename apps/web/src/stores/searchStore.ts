// ─────────────────────────────────────────────────────────────────────────────
// stores/searchStore.ts — Zustand store for full-text search
//
// Debounces API calls: the query string updates immediately for a responsive UI
// but the network request fires only after 350ms of inactivity.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { apiSearchBookmarks, type SearchParams, type SearchResponse } from '../api/search.api.js';
import type { BookmarkItem } from '../api/bookmarks.api.js';

interface SearchState {
  query: string;
  results: BookmarkItem[];
  total: number;
  isSearching: boolean;
  error: string | null;
  activeFilters: Omit<SearchParams, 'q' | 'limit'>;

  setQuery: (q: string) => void;
  setFilter: (filters: Partial<Omit<SearchParams, 'q' | 'limit'>>) => void;
  clearSearch: () => void;
  runSearch: (params: SearchParams) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => {
  // Private to this store closure — avoids module-scope global leaking across HMR reloads.
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    query: '',
    results: [],
    total: 0,
    isSearching: false,
    error: null,
    activeFilters: {},

    setQuery: (q) => {
      set({ query: q });

      // Clear previous timer
      if (debounceTimer) clearTimeout(debounceTimer);

      if (!q.trim()) {
        set({ results: [], total: 0, isSearching: false, error: null });
        return;
      }

      debounceTimer = setTimeout(() => {
        const { activeFilters } = get();
        void get().runSearch({ q: q.trim(), ...activeFilters, limit: 48 });
      }, 350);
    },

    setFilter: (filters) => {
      const newFilters = { ...get().activeFilters, ...filters };
      set({ activeFilters: newFilters });

      const { query } = get();
      if (query.trim()) {
        void get().runSearch({ q: query.trim(), ...newFilters, limit: 48 });
      }
    },

    clearSearch: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      set({ query: '', results: [], total: 0, isSearching: false, error: null, activeFilters: {} });
    },

    runSearch: async (params) => {
      set({ isSearching: true, error: null });
      try {
        const data: SearchResponse = await apiSearchBookmarks(params);
        set({ results: data.bookmarks, total: data.total, isSearching: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        set({ error: message, isSearching: false });
      }
    },
  };
});
