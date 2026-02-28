// ─────────────────────────────────────────────────────────────────────────────
// api/tags.api.ts — Tag endpoint functions
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './client.js';

export interface TagItem {
  id: string;
  name: string;
  color: string | null;
  userId: string;
  createdAt: string;
  bookmarkCount: number;
}

export interface CreateTagParams {
  name: string;
  color?: string;
}

export interface UpdateTagParams {
  name?: string;
  color?: string | null;
}

export interface MergeTagsParams {
  sourceIds: string[];
  targetId: string;
}

export async function apiListTags(): Promise<TagItem[]> {
  const res = await apiClient.get<{ success: true; data: TagItem[] }>('/api/v1/tags');
  return res.data.data;
}

export async function apiCreateTag(params: CreateTagParams): Promise<TagItem> {
  const res = await apiClient.post<{ success: true; data: TagItem }>('/api/v1/tags', params);
  return res.data.data;
}

export async function apiUpdateTag(id: string, params: UpdateTagParams): Promise<TagItem> {
  const res = await apiClient.patch<{ success: true; data: TagItem }>(`/api/v1/tags/${id}`, params);
  return res.data.data;
}

export async function apiDeleteTag(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/tags/${id}`);
}

export async function apiMergeTags(params: MergeTagsParams): Promise<TagItem> {
  const res = await apiClient.post<{ success: true; data: TagItem }>('/api/v1/tags/merge', params);
  return res.data.data;
}
