// ─────────────────────────────────────────────────────────────────────────────
// api/annotations.api.ts — Annotation endpoint functions
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './client.js';
import type { ApiSuccessResponse } from '@mindpalace/shared';

export interface AnnotationItem {
  id: string;
  type: 'HIGHLIGHT' | 'NOTE' | 'BOOKMARK_WITHIN_PAGE';
  content: string;
  positionData: {
    startOffset: number;
    endOffset: number;
    selector?: string;
    xpath?: string;
  } | null;
  color: string | null;
  isPublic: boolean;
  permanentCopyId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnotationParams {
  type?: 'HIGHLIGHT' | 'NOTE' | 'BOOKMARK_WITHIN_PAGE';
  content: string;
  positionData?: AnnotationItem['positionData'];
  color?: string;
  isPublic?: boolean;
}

export interface UpdateAnnotationParams {
  content?: string;
  positionData?: AnnotationItem['positionData'];
  color?: string | null;
  isPublic?: boolean;
}

export async function apiListAnnotations(bookmarkId: string): Promise<AnnotationItem[]> {
  const res = await apiClient.get<ApiSuccessResponse<AnnotationItem[]>>(
    `/api/v1/bookmarks/${bookmarkId}/annotations`,
  );
  return res.data.data;
}

export async function apiCreateAnnotation(
  bookmarkId: string,
  params: CreateAnnotationParams,
): Promise<AnnotationItem> {
  const res = await apiClient.post<ApiSuccessResponse<AnnotationItem>>(
    `/api/v1/bookmarks/${bookmarkId}/annotations`,
    params,
  );
  return res.data.data;
}

export async function apiUpdateAnnotation(
  bookmarkId: string,
  annotationId: string,
  params: UpdateAnnotationParams,
): Promise<AnnotationItem> {
  const res = await apiClient.patch<ApiSuccessResponse<AnnotationItem>>(
    `/api/v1/bookmarks/${bookmarkId}/annotations/${annotationId}`,
    params,
  );
  return res.data.data;
}

export async function apiDeleteAnnotation(bookmarkId: string, annotationId: string): Promise<void> {
  await apiClient.delete(`/api/v1/bookmarks/${bookmarkId}/annotations/${annotationId}`);
}
