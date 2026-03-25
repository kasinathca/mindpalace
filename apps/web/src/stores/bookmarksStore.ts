// ─────────────────────────────────────────────────────────────────────────────
// stores/bookmarksStore.ts — Zustand bookmark state store
//
// Manages: bookmark list, pagination, filters, loading state, error state
// Supports optimistic UI: items update immediately and roll back on error.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import {
  apiListBookmarks,
  apiGetBookmark,
  apiCreateBookmark,
  apiUpdateBookmark,
  apiDeleteBookmark,
  apiBatchDeleteBookmarks,
  type BookmarkItem,
  type CreateBookmarkParams,
  type UpdateBookmarkParams,
} from '../api/bookmarks.api.js';
import type { BookmarkFilters } from '@mindpalace/shared';
import { useCollectionsStore } from './collectionsStore.js';
import { useTagsStore } from './tagsStore.js';
import { getUserFriendlyErrorMessage } from '../utils/apiError.js';

interface PaginationState {
  total: number;
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
}

interface BookmarksState {
  bookmarks: BookmarkItem[];
  pagination: PaginationState;
  filters: BookmarkFilters;
  isLoading: boolean;
  error: string | null;
}

interface BookmarksActions {
  fetchBookmarks: (filters?: BookmarkFilters, replace?: boolean) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  createBookmark: (input: CreateBookmarkParams) => Promise<BookmarkItem>;
  updateBookmark: (id: string, input: UpdateBookmarkParams) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  batchDeleteBookmarks: (ids: string[]) => Promise<void>;
  setFilters: (filters: BookmarkFilters) => void;
  clearError: () => void;
  reset: () => void;
}

type BookmarksStore = BookmarksState & BookmarksActions;

const defaultPagination: PaginationState = {
  total: 0,
  limit: 24,
  nextCursor: null,
  hasNextPage: false,
};

export const useBookmarksStore = create<BookmarksStore>((set, get) => ({
  bookmarks: [],
  pagination: defaultPagination,
  filters: {},
  isLoading: false,
  error: null,

  fetchBookmarks: async (filters, replace = true) => {
    set({ isLoading: true, error: null });
    if (filters) set({ filters });

    try {
      const result = await apiListBookmarks({ ...get().filters, ...filters });
      set((state) => ({
        bookmarks: replace ? result.bookmarks : [...state.bookmarks, ...result.bookmarks],
        pagination: result.pagination,
        isLoading: false,
      }));
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: getUserFriendlyErrorMessage(err, 'Failed to load bookmarks.'),
      });
    }
  },

  fetchNextPage: async () => {
    const { pagination, filters, isLoading } = get();
    if (!pagination.hasNextPage || isLoading) return;
    await get().fetchBookmarks(
      pagination.nextCursor !== null
        ? { ...filters, cursor: pagination.nextCursor }
        : { ...filters },
      false,
    );
  },

  createBookmark: async (input) => {
    // Optimistic update: add a placeholder immediately
    const placeholder: BookmarkItem = {
      id: `optimistic-${Date.now()}`,
      url: input.url,
      title: input.title ?? new URL(input.url).hostname,
      description: input.description ?? null,
      faviconUrl: null,
      coverImageUrl: null,
      notes: input.notes ?? null,
      isPublic: input.isPublic ?? false,
      isPinned: input.isPinned ?? false,
      isFavourite: input.isFavourite ?? false,
      linkStatus: 'UNCHECKED',
      lastCheckedAt: null,
      readAt: null,
      userId: '',
      collectionId: input.collectionId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };

    set((state) => ({ bookmarks: [placeholder, ...state.bookmarks] }));

    try {
      const created = await apiCreateBookmark(input);
      // Replace placeholder with real data
      set((state) => ({
        bookmarks: state.bookmarks.map((b) => (b.id === placeholder.id ? created : b)),
        pagination: { ...state.pagination, total: state.pagination.total + 1 },
      }));

      // Metadata extraction runs asynchronously in workers; use bounded retry
      // with backoff so we eventually stop polling and avoid hidden loops.
      const MAX_METADATA_REFRESH_ATTEMPTS = 4;
      const INITIAL_METADATA_DELAY_MS = 2_000;

      const scheduleMetadataRefresh = (attempt: number, delayMs: number): void => {
        if (attempt >= MAX_METADATA_REFRESH_ATTEMPTS) return;

        setTimeout(() => {
          void apiGetBookmark(created.id)
            .then((refreshed) => {
              set((state) => ({
                bookmarks: state.bookmarks.map((b) => (b.id === refreshed.id ? refreshed : b)),
              }));

              // Continue polling while record looks unchanged from create time.
              const shouldRetry = refreshed.updatedAt === created.updatedAt;
              if (shouldRetry) {
                scheduleMetadataRefresh(attempt + 1, delayMs * 2);
              }
            })
            .catch((err: unknown) => {
              if (attempt + 1 >= MAX_METADATA_REFRESH_ATTEMPTS) {
                set({
                  error: `Metadata refresh failed: ${getUserFriendlyErrorMessage(
                    err,
                    'Please retry shortly.',
                  )}`,
                });
                return;
              }

              scheduleMetadataRefresh(attempt + 1, delayMs * 2);
            });
        }, delayMs);
      };

      scheduleMetadataRefresh(0, INITIAL_METADATA_DELAY_MS);

      void useCollectionsStore.getState().fetchTree();
      if (input.tags && input.tags.length > 0) {
        void useTagsStore.getState().fetchTags();
      }

      return created;
    } catch (err: unknown) {
      // Roll back optimistic update
      set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== placeholder.id),
        error: getUserFriendlyErrorMessage(err, 'Failed to save bookmark.'),
      }));
      throw err;
    }
  },

  updateBookmark: async (id, input) => {
    const previous = get().bookmarks.find((b) => b.id === id);

    // Optimistic update — exclude `tags` from input spread since it's string[] but BookmarkItem.tags is Tag[]
    const { tags: _tags, ...inputWithoutTags } = input;
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...inputWithoutTags } : b)),
    }));

    try {
      const updated = await apiUpdateBookmark(id, input);
      set((state) => ({
        bookmarks: state.bookmarks.map((b) => (b.id === id ? updated : b)),
      }));
      if (input.collectionId !== undefined) {
        void useCollectionsStore.getState().fetchTree();
      }
      if (input.tags !== undefined) {
        void useTagsStore.getState().fetchTags();
      }
    } catch (err: unknown) {
      // Roll back
      if (previous) {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) => (b.id === id ? previous : b)),
          error: getUserFriendlyErrorMessage(err, 'Failed to update bookmark.'),
        }));
      }
      throw err;
    }
  },

  deleteBookmark: async (id) => {
    const previous = get().bookmarks;

    // Optimistic removal
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== id),
      pagination: { ...state.pagination, total: state.pagination.total - 1 },
    }));

    try {
      await apiDeleteBookmark(id);
      void useCollectionsStore.getState().fetchTree();
      if (previous.some((bookmark) => bookmark.id === id && bookmark.tags.length > 0)) {
        void useTagsStore.getState().fetchTags();
      }
    } catch (err: unknown) {
      set({
        bookmarks: previous,
        error: getUserFriendlyErrorMessage(err, 'Failed to delete bookmark.'),
      });
      throw err;
    }
  },

  batchDeleteBookmarks: async (ids) => {
    const previous = get().bookmarks;

    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => !ids.includes(b.id)),
      pagination: {
        ...state.pagination,
        total: state.pagination.total - ids.length,
      },
    }));

    try {
      await apiBatchDeleteBookmarks(ids);
      void useCollectionsStore.getState().fetchTree();
      if (previous.some((bookmark) => ids.includes(bookmark.id) && bookmark.tags.length > 0)) {
        void useTagsStore.getState().fetchTags();
      }
    } catch (err: unknown) {
      set({
        bookmarks: previous,
        error: getUserFriendlyErrorMessage(err, 'Failed to delete bookmarks.'),
      });
      throw err;
    }
  },

  setFilters: (filters) => set({ filters }),
  clearError: () => set({ error: null }),
  reset: () =>
    set({
      bookmarks: [],
      pagination: defaultPagination,
      filters: {},
      isLoading: false,
      error: null,
    }),
}));
