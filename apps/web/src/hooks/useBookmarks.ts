// ─────────────────────────────────────────────────────────────────────────────
// hooks/useBookmarks.ts — Load and cache bookmarks for the active collection
//
// Wraps the bookmarksStore fetch with automatic refetch when the selected
// collection changes. Returns loading, error, and bookmark list.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useBookmarksStore } from '../stores/bookmarksStore.js';
import { useCollectionsStore } from '../stores/collectionsStore.js';
import type { BookmarkItem } from '../api/bookmarks.api.js';

export interface UseBookmarksResult {
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Fetches bookmarks for the currently selected collection. Re-fetches
 * automatically whenever `selectedCollectionId` changes.
 */
export function useBookmarks(): UseBookmarksResult {
  const { bookmarks, isLoading, error, pagination, fetchBookmarks, fetchNextPage } =
    useBookmarksStore();
  const selectedId = useCollectionsStore((s) => s.selectedId);

  useEffect(() => {
    void fetchBookmarks({ ...(selectedId ? { collectionId: selectedId } : {}) }, true);
  }, [selectedId, fetchBookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    hasNextPage: pagination.hasNextPage,
    fetchNextPage,
    refresh: async () => {
      await fetchBookmarks({ ...(selectedId ? { collectionId: selectedId } : {}) }, true);
    },
  };
}
