// ─────────────────────────────────────────────────────────────────────────────
// api/collections.api.ts — Collection endpoint functions
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './client.js';
import type { ApiSuccessResponse } from '@mindpalace/shared';

// Matches CollectionNode from collections.service.ts
export interface CollectionNode {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isPublic: boolean;
  sortOrder: number;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  children: CollectionNode[];
  _count: { bookmarks: number };
}

export interface CreateCollectionParams {
  name: string;
  parentId?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCollectionParams {
  name?: string;
  parentId?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

export async function apiGetCollectionTree(): Promise<CollectionNode[]> {
  const res = await apiClient.get<ApiSuccessResponse<CollectionNode[]>>('/api/v1/collections');
  return res.data.data;
}

export async function apiCreateCollection(input: CreateCollectionParams): Promise<CollectionNode> {
  const res = await apiClient.post<ApiSuccessResponse<CollectionNode>>(
    '/api/v1/collections',
    input,
  );
  return res.data.data;
}

export async function apiUpdateCollection(
  id: string,
  input: UpdateCollectionParams,
): Promise<CollectionNode> {
  const res = await apiClient.patch<ApiSuccessResponse<CollectionNode>>(
    `/api/v1/collections/${id}`,
    input,
  );
  return res.data.data;
}

export async function apiDeleteCollection(
  id: string,
  action: 'move' | 'delete' = 'delete',
  targetCollectionId?: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/collections/${id}`, {
    params: {
      action,
      ...(targetCollectionId ? { targetCollectionId } : {}),
    },
  });
}

export async function apiReorderCollection(id: string, sortOrder: number): Promise<void> {
  await apiClient.patch(`/api/v1/collections/${id}/reorder`, { sortOrder });
}
