// ─────────────────────────────────────────────────────────────────────────────
// pages/SearchPage.tsx — Real-time debounced full-text search
//
// Input debounces at 350ms (controlled by searchStore). Shows rank-sorted
// results with matched bookmark cards. Supports filter chips for tags,
// pinned, and favourites inline above results.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { useSearchStore } from '../stores/searchStore.js';
import { useTagsStore } from '../stores/tagsStore.js';
import { BookmarkCard } from '../components/bookmarks/BookmarkCard.js';
import { EmptyState } from '../components/common/EmptyState.js';

function SearchIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
      />
    </svg>
  );
}

function SpinnerIcon(): React.JSX.Element {
  return (
    <svg
      className="h-5 w-5 animate-spin text-muted-foreground"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function SearchPage(): React.ReactElement {
  const { query, results, total, isSearching, error, setQuery, clearSearch } = useSearchStore();
  const { tags, fetchTags } = useTagsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tags for filter chips
  useEffect(() => {
    void fetchTags();
    // Auto-focus the search input on mount
    inputRef.current?.focus();
    return () => clearSearch();
  }, [fetchTags, clearSearch]);

  const showResults = query.trim().length > 0;
  const showEmpty = showResults && !isSearching && results.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* ── Search input ── */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {isSearching ? <SpinnerIcon /> : <SearchIcon />}
        </div>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search bookmarks… (title, description, URL, notes)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-base outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          aria-label="Search bookmarks"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filter chips ── */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.slice(0, 12).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                const current = useSearchStore.getState().activeFilters.tagIds ?? [];
                const next = current.includes(tag.id)
                  ? current.filter((id) => id !== tag.id)
                  : [...current, tag.id];
                useSearchStore.getState().setFilter(next.length > 0 ? { tagIds: next } : {});
              }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                useSearchStore.getState().activeFilters.tagIds?.includes(tag.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
              style={tag.color ? ({ '--tag-color': tag.color } as React.CSSProperties) : {}}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Results header ── */}
      {showResults && !isSearching && results.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          {total} result{total !== 1 ? 's' : ''} for{' '}
          <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
        </p>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {showEmpty && (
        <EmptyState
          icon={<span className="text-5xl">🔍</span>}
          title="No results found"
          description="Try different keywords, or check if you applied filters too narrowly."
          className="py-12"
        />
      )}

      {/* ── Results grid ── */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} view="grid" />
          ))}
        </div>
      )}

      {/* ── Prompt to start typing ── */}
      {!showResults && (
        <EmptyState
          icon={<span className="text-5xl">✨</span>}
          title="Search your library"
          description="Search across titles, descriptions, URLs, and your personal notes."
          className="py-12"
        />
      )}
    </div>
  );
}
