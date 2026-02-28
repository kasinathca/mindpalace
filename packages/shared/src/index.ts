// ─────────────────────────────────────────────────────────────────────────────
// @mindpalace/shared — Shared TypeScript types
//
// These types are the single source of truth for all data structures shared
// between apps/api and apps/web. Update here; both packages auto-update.
// ─────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────
// ENUMERATIONS
// ──────────────────────────────

export type Theme = 'SYSTEM' | 'LIGHT' | 'DARK';
export type ViewMode = 'GRID' | 'LIST' | 'COMPACT';

/**
 * Must exactly mirror the `LinkStatus` enum in `prisma/schema.prisma`.
 * REDIRECTED = permanent 301 redirect detected by LinkHealthWorker (Phase 3).
 */
export type LinkStatus = 'UNCHECKED' | 'OK' | 'BROKEN' | 'REDIRECTED';

export type AnnotationType = 'HIGHLIGHT' | 'NOTE' | 'BOOKMARK_WITHIN_PAGE';

// ──────────────────────────────
// USER
// ──────────────────────────────

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  theme: Theme;
  defaultView: ViewMode;
  emailVerified: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface UserProfile extends User {
  bookmarkCount: number;
  collectionCount: number;
}

// ──────────────────────────────
// COLLECTION
// ──────────────────────────────

export interface Collection {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  /** Optional description shown as a tooltip in the sidebar. */
  description: string | null;
  /** Hex colour for the collection badge, e.g. "#6366F1". */
  color: string | null;
  /** Lucide icon name or emoji shown next to the collection name. */
  icon: string | null;
  /** Whether this collection is visible to unauthenticated users. */
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A collection with its children populated — used for tree rendering. */
export interface CollectionNode extends Collection {
  children: CollectionNode[];
  bookmarkCount?: number;
}

// ──────────────────────────────
// BOOKMARK
// ──────────────────────────────

export interface Bookmark {
  id: string;
  userId: string;
  collectionId: string | null;
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
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
}

export interface BookmarkDetail extends Bookmark {
  collection: Pick<Collection, 'id' | 'name'> | null;
  annotations: Annotation[];
  permanentCopy?: PermanentCopy;
}

// ──────────────────────────────
// TAG
// ──────────────────────────────

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
  bookmarkCount?: number;
}

// ──────────────────────────────
// PERMANENT COPY
// ──────────────────────────────

export interface PermanentCopy {
  id: string;
  bookmarkId: string;
  rawHtml: string | null;
  articleContent: string | null;
  screenshotPath: string | null;
  mimeType: string;
  sizeBytes: number | null;
  capturedAt: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────
// ANNOTATION
// ──────────────────────────────

export interface AnnotationPositionData {
  startOffset: number;
  endOffset: number;
  /** CSS or XPath selector that identifies the target element. */
  selector?: string;
  /** XPath to the target element. */
  xpath?: string;
}

export interface Annotation {
  id: string;
  permanentCopyId: string;
  userId: string;
  type: string;
  content: string;
  positionData: AnnotationPositionData | null;
  color: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────
// API RESPONSE ENVELOPES
// ──────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  /** Zod field-level validation errors (returned on 422 Unprocessable Entity). */
  issues?: Array<{ field: string; message: string }>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  total: number;
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
}

// ──────────────────────────────
// API REQUEST / INPUT TYPES
// ──────────────────────────────

export interface CreateBookmarkInput {
  url: string;
  collectionId?: string;
  title?: string;
  description?: string;
  tagIds?: string[];
}

export interface UpdateBookmarkInput {
  title?: string;
  description?: string;
  collectionId?: string;
  tagIds?: string[];
}

export interface CreateCollectionInput {
  name: string;
  parentId?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  parentId?: string | null;
  sortOrder?: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string | null;
}

export interface BookmarkFilters {
  collectionId?: string;
  tagIds?: string[];
  linkStatus?: LinkStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

/** Filters for the search endpoint. Uses `q` to match the backend `SearchQuerySchema.q` parameter. */
export interface SearchFilters extends BookmarkFilters {
  q: string;
}

export interface CreateAnnotationInput {
  type?: AnnotationType;
  content: string;
  positionData?: AnnotationPositionData;
  color?: string;
  isPublic?: boolean;
}

// ──────────────────────────────
// AUTH INPUT TYPES (used by both web forms and API)
// ──────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface UpdateMeInput {
  displayName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
