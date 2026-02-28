// ─────────────────────────────────────────────────────────────────────────────
// api/bookmarks.api.ts — Bookmark endpoint functions
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './client.js';
import type { ApiSuccessResponse, BookmarkFilters } from '@mindpalace/shared';

// The API returns this shape (matching bookmarks.service.ts BookmarkWithTags)
export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  coverImageUrl: string | null;
  notes: string | null;
  isPublic: boolean;
  isPinned: boolean;
  isFavourite: boolean;
  linkStatus: string;
  lastCheckedAt: string | null;
  readAt: string | null;
  userId: string;
  collectionId: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
}

interface PaginationMeta {
  total: number;
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
}

interface BookmarksListResponse {
  bookmarks: BookmarkItem[];
  pagination: PaginationMeta;
}

export interface CreateBookmarkParams {
  url: string;
  collectionId?: string;
  title?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  isPublic?: boolean;
  isPinned?: boolean;
  isFavourite?: boolean;
}

export interface UpdateBookmarkParams {
  title?: string;
  description?: string;
  notes?: string;
  collectionId?: string | null;
  isPublic?: boolean;
  isPinned?: boolean;
  isFavourite?: boolean;
  tags?: string[];
  readAt?: string | null;
}

export async function apiListBookmarks(filters?: BookmarkFilters): Promise<BookmarksListResponse> {
  const res = await apiClient.get<ApiSuccessResponse<BookmarksListResponse>>('/api/v1/bookmarks', {
    params: filters,
  });
  return res.data.data;
}

export async function apiGetBookmark(id: string): Promise<BookmarkItem> {
  const res = await apiClient.get<ApiSuccessResponse<BookmarkItem>>(`/api/v1/bookmarks/${id}`);
  return res.data.data;
}

export async function apiCreateBookmark(input: CreateBookmarkParams): Promise<BookmarkItem> {
  const res = await apiClient.post<ApiSuccessResponse<BookmarkItem>>('/api/v1/bookmarks', input);
  return res.data.data;
}

export async function apiUpdateBookmark(
  id: string,
  input: UpdateBookmarkParams,
): Promise<BookmarkItem> {
  const res = await apiClient.patch<ApiSuccessResponse<BookmarkItem>>(
    `/api/v1/bookmarks/${id}`,
    input,
  );
  return res.data.data;
}

export async function apiDeleteBookmark(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/bookmarks/${id}`);
}

export async function apiBatchDeleteBookmarks(ids: string[]): Promise<{ deleted: number }> {
  const res = await apiClient.delete<ApiSuccessResponse<{ deleted: number }>>('/api/v1/bookmarks', {
    data: { ids },
  });
  return res.data.data;
}

export async function apiBatchMoveBookmarks(
  ids: string[],
  collectionId: string | null,
): Promise<{ updated: number }> {
  const res = await apiClient.patch<ApiSuccessResponse<{ updated: number }>>(
    '/api/v1/bookmarks/batch/move',
    { ids, collectionId },
  );
  return res.data.data;
}

export async function apiBatchTagBookmarks(
  ids: string[],
  tagIds: string[],
  mode: 'add' | 'remove',
): Promise<{ updated: number }> {
  const res = await apiClient.patch<ApiSuccessResponse<{ updated: number }>>(
    '/api/v1/bookmarks/batch/tag',
    { ids, tagIds, mode },
  );
  return res.data.data;
}

// ── Permanent copy ────────────────────────────────────────────────────────────

export interface PermanentCopyItem {
  id: string;
  bookmarkId: string;
  articleContent: string | null;
  sizeBytes: number | null;
  capturedAt: string;
  failureReason: string | null;
  mimeType: string;
}

export async function apiGetPermanentCopy(bookmarkId: string): Promise<PermanentCopyItem> {
  const res = await apiClient.get<ApiSuccessResponse<PermanentCopyItem>>(
    `/api/v1/bookmarks/${bookmarkId}/permanent-copy`,
  );
  return res.data.data;
}

export async function apiCheckLink(bookmarkId: string): Promise<{ queued: true }> {
  const res = await apiClient.post<ApiSuccessResponse<{ queued: true }>>(
    `/api/v1/bookmarks/${bookmarkId}/check`,
  );
  return res.data.data;
}

// ── Duplicate / Similar detection ─────────────────────────────────────────────

/**
 * Returns bookmarks whose base URL (scheme + host + path, ignoring query string)
 * matches `url`. Used by AddBookmarkModal to warn before saving a duplicate.
 */
export async function apiGetSimilarBookmarks(url: string): Promise<BookmarkItem[]> {
  const res = await apiClient.get<ApiSuccessResponse<BookmarkItem[]>>(
    `/api/v1/search/similar?url=${encodeURIComponent(url)}`,
  );
  return res.data.data;
}
