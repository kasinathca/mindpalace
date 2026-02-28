// ─────────────────────────────────────────────────────────────────────────────
// api/search.api.ts — Full-text search endpoint functions
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './client.js';
import type { BookmarkItem } from './bookmarks.api.js';

export interface SearchParams {
  q: string;
  collectionId?: string;
  tagIds?: string[];
  isPinned?: boolean;
  isFavourite?: boolean;
  linkStatus?: 'OK' | 'BROKEN' | 'UNCHECKED' | 'REDIRECTED';
  limit?: number;
}

export interface SearchResponse {
  bookmarks: BookmarkItem[];
  total: number;
  query: string;
}

export async function apiSearchBookmarks(params: SearchParams): Promise<SearchResponse> {
  const { tagIds, isPinned, isFavourite, ...rest } = params;
  const queryParams: Record<string, string | string[] | number | boolean | undefined> = {
    ...rest,
    ...(tagIds && tagIds.length > 0 ? { tagIds } : {}),
    ...(isPinned !== undefined ? { isPinned: String(isPinned) } : {}),
    ...(isFavourite !== undefined ? { isFavourite: String(isFavourite) } : {}),
  };

  const res = await apiClient.get<{ success: true; data: SearchResponse }>('/api/v1/search', {
    params: queryParams,
  });
  return res.data.data;
}
