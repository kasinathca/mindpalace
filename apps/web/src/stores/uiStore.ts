// ─────────────────────────────────────────────────────────────────────────────
// stores/uiStore.ts — Global UI state store
//
// Manages sidebar visibility, view mode, active modals, and toast notifications.
// This is the single source of truth for transient UI state that needs to be
// accessed across component trees without prop drilling.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';

// ── Toast ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Auto-dismiss after this many milliseconds. Default: 4000. */
  duration?: number;
}

// ── State interface ───────────────────────────────────────────────────────────

interface UiState {
  /** Sidebar open / collapsed */
  sidebarOpen: boolean;
  /** Current view mode for the bookmark grid */
  viewMode: 'grid' | 'list';
  /** IDs of currently selected bookmarks (for batch operations) */
  selectedBookmarkIds: string[];
  /** Queue of active toast notifications */
  toasts: ToastMessage[];

  // ── Actions ──────────────────────────────────────────────────────────────
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;

  // Selection
  selectBookmark: (id: string) => void;
  deselectBookmark: (id: string) => void;
  toggleBookmarkSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  // Toasts
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  /** Convenience: show a success toast */
  toast: (title: string, variant?: ToastVariant, description?: string) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  viewMode: 'grid',
  selectedBookmarkIds: [],
  toasts: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),

  selectBookmark: (id) =>
    set((s) => ({
      selectedBookmarkIds: s.selectedBookmarkIds.includes(id)
        ? s.selectedBookmarkIds
        : [...s.selectedBookmarkIds, id],
    })),

  deselectBookmark: (id) =>
    set((s) => ({
      selectedBookmarkIds: s.selectedBookmarkIds.filter((i) => i !== id),
    })),

  toggleBookmarkSelection: (id) => {
    const { selectedBookmarkIds } = get();
    if (selectedBookmarkIds.includes(id)) {
      set({ selectedBookmarkIds: selectedBookmarkIds.filter((i) => i !== id) });
    } else {
      set({ selectedBookmarkIds: [...selectedBookmarkIds, id] });
    }
  },

  selectAll: (ids) => set({ selectedBookmarkIds: ids }),
  clearSelection: () => set({ selectedBookmarkIds: [] }),

  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.duration ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toast: (title, variant = 'default', description) => {
    const msg: Omit<ToastMessage, 'id'> = { title, variant };
    if (description !== undefined) msg.description = description;
    get().addToast(msg);
  },
}));
