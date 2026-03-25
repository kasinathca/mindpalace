// ─────────────────────────────────────────────────────────────────────────────
// pages/DashboardPage.tsx — Bookmark library dashboard
//
// Displays the user's bookmarks filtered by the currently selected collection.
// Supports grid and list view modes. Infinite scroll loads more on demand.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useBookmarksStore } from '../stores/bookmarksStore.js';
import { useCollectionsStore } from '../stores/collectionsStore.js';
import { BookmarkCard } from '../components/bookmarks/BookmarkCard.js';
import { AddBookmarkModal } from '../components/bookmarks/AddBookmarkModal.js';
import { BatchActionBar } from '../components/bookmarks/BatchActionBar.js';
import {
  FilterPanel,
  type BookmarkFilters as PanelFilters,
} from '../components/bookmarks/FilterPanel.js';
import { Button } from '../components/ui/button.js';
import { FullPageSpinner } from '../components/common/LoadingSpinner.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { InlineNotice } from '../components/common/InlineNotice.js';
import type { BookmarkFilters } from '@mindpalace/shared';

// ── ViewToggle icons ──────────────────────────────────────────────────────────

function GridIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function ListIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [addModalOpen, setAddModalOpen] = useState(false);
  // Multi-select state (for BatchActionBar)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Filter panel visibility + active filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [panelFilters, setPanelFilters] = useState<PanelFilters>({
    tagIds: [],
    linkStatus: '',
    isPinned: undefined,
    isFavourite: undefined,
  });

  const { bookmarks, pagination, isLoading, error, fetchBookmarks, fetchNextPage } =
    useBookmarksStore();
  const { selectedId, tree } = useCollectionsStore();

  // The main scroll container is the <main> element rendered by AppShell.
  // We reference it once (stable across renders) for the virtualizer.
  const scrollElement = useMemo<HTMLElement | null>(
    () => document.getElementById('main-content'),
    [],
  );

  // Virtual list for the list view — renders only visible rows, reducing DOM
  // node count dramatically when thousands of bookmarks are accumulated.
  const listVirtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 72, // approximate height of a list-view BookmarkCard
    overscan: 8,
  });
  const virtualListItems = listVirtualizer.getVirtualItems();

  // Derive selected collection name
  function findCollectionName(nodes: typeof tree, id: string | null): string {
    if (!id) return 'All Bookmarks';
    for (const node of nodes) {
      if (node.id === id) return node.name;
      const found = findCollectionName(node.children, id);
      if (found !== 'All Bookmarks') return found;
    }
    return 'All Bookmarks';
  }
  const collectionName = findCollectionName(tree, selectedId);

  // Fetch bookmarks whenever the selected collection OR active filters change
  useEffect(() => {
    const filters: BookmarkFilters = {
      ...(selectedId ? { collectionId: selectedId } : {}),
      ...(panelFilters.tagIds.length > 0 ? { tagIds: panelFilters.tagIds } : {}),
      ...(panelFilters.linkStatus ? { linkStatus: panelFilters.linkStatus } : {}),
      ...(panelFilters.isPinned !== undefined ? { isPinned: panelFilters.isPinned } : {}),
      ...(panelFilters.isFavourite !== undefined ? { isFavourite: panelFilters.isFavourite } : {}),
    };
    void fetchBookmarks(filters, true);
    // Clear selection when filters/collection changes
    setSelectedIds([]);
  }, [selectedId, panelFilters, fetchBookmarks]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && pagination.hasNextPage && !isLoading) {
        void fetchNextPage();
      }
    },
    [pagination.hasNextPage, isLoading, fetchNextPage],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 });
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [handleIntersect]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{collectionName}</h1>
          {pagination.total > 0 && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} bookmark{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            type="button"
            aria-label="Toggle filters"
            aria-pressed={showFilterPanel}
            onClick={() => setShowFilterPanel((v) => !v)}
            className={`rounded-md p-2 text-sm transition-colors ${
              showFilterPanel
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-accent'
            }`}
            title="Filters"
          >
            {/* Filter icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
          </button>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
              className={`p-2 transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={`p-2 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              <ListIcon />
            </button>
          </div>

          {/* Add bookmark */}
          <Button onClick={() => setAddModalOpen(true)}>+ Add Bookmark</Button>
        </div>
      </div>

      {/* ── Filter panel ───────────────────────────────────────────── */}
      {showFilterPanel && (
        <FilterPanel
          filters={panelFilters}
          onChange={(f) => setPanelFilters(f)}
          className="rounded-xl border border-border bg-card p-4"
        />
      )}

      {/* ── Error banner ───────────────────────────────────────────── */}
      {error && <InlineNotice message={error} variant="error" />}

      {/* ── Loading (initial) ──────────────────────────────────────── */}
      {isLoading && bookmarks.length === 0 && <FullPageSpinner />}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!isLoading && bookmarks.length === 0 && !error && (
        <EmptyState
          icon={<span className="text-5xl">🔖</span>}
          title="No bookmarks yet"
          description="Save your first link to get started."
          action={<Button onClick={() => setAddModalOpen(true)}>+ Add Bookmark</Button>}
          className="py-24"
        />
      )}

      {/* ── Bookmark grid / list ───────────────────────────────────── */}
      {bookmarks.length > 0 && (
        <>
          {view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  view="grid"
                  isSelected={selectedIds.includes(bookmark.id)}
                  onToggleSelect={(id) =>
                    setSelectedIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                />
              ))}
            </div>
          ) : (
            /* Virtual list: a fixed-height container with absolutely positioned rows.
               Only the rows near the viewport are mounted in the DOM. */
            <div style={{ height: `${listVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualListItems.map((virtualItem) => {
                const bookmark = bookmarks[virtualItem.index];
                if (!bookmark) return null;
                return (
                  <div
                    key={bookmark.id}
                    data-index={virtualItem.index}
                    ref={listVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: '0.5rem',
                    }}
                  >
                    <BookmarkCard
                      bookmark={bookmark}
                      view="list"
                      isSelected={selectedIds.includes(bookmark.id)}
                      onToggleSelect={(id) =>
                        setSelectedIds((prev) =>
                          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading more indicator */}
          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />
        </>
      )}

      {/* ── Add Bookmark Modal ─────────────────────────────────────── */}
      <AddBookmarkModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        {...(selectedId !== null ? { defaultCollectionId: selectedId } : {})}
      />

      {/* ── Batch action bar (floats when ≥1 bookmark is selected) ── */}
      <BatchActionBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} />
    </div>
  );
}
