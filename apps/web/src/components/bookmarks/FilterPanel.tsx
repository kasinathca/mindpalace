// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/FilterPanel.tsx — Collapsible filter sidebar
//
// Exposes filters: tags (multi-select checkboxes), link status, pinned,
// favourites. Communicates with the bookmarks store via URL search params
// or a simple callback prop so DashboardPage controls the query.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTagsStore } from '../../stores/tagsStore.js';
import { cn } from '../../utils/cn.js';

export interface BookmarkFilters {
  tagIds: string[];
  linkStatus: '' | 'OK' | 'BROKEN' | 'UNCHECKED';
  isPinned: boolean | undefined;
  isFavourite: boolean | undefined;
}

interface FilterPanelProps {
  filters: BookmarkFilters;
  onChange: (filters: BookmarkFilters) => void;
  className?: string;
}

export function FilterPanel({ filters, onChange, className }: FilterPanelProps): React.JSX.Element {
  const { tags, fetchTags } = useTagsStore();
  const [tagSearch, setTagSearch] = useState('');

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  const visibleTags = tagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  function toggleTag(id: string): void {
    const newTagIds = filters.tagIds.includes(id)
      ? filters.tagIds.filter((t) => t !== id)
      : [...filters.tagIds, id];
    onChange({ ...filters, tagIds: newTagIds });
  }

  return (
    <aside className={cn('flex flex-col gap-6', className)}>
      {/* ── Tags ── */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </h3>
        <input
          type="search"
          placeholder="Filter tags…"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
        />
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {visibleTags.map((tag) => (
            <li key={tag.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent">
                <input
                  type="checkbox"
                  checked={filters.tagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="h-3.5 w-3.5 rounded"
                />
                {tag.color && (
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                <span className="truncate text-sm">{tag.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{tag.bookmarkCount}</span>
              </label>
            </li>
          ))}
          {visibleTags.length === 0 && (
            <li className="px-1 py-1 text-xs text-muted-foreground">No tags found</li>
          )}
        </ul>
      </section>

      {/* ── Link Status ── */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Link Status
        </h3>
        <div className="flex flex-col gap-1">
          {(
            [
              { value: '', label: 'Any' },
              { value: 'OK', label: '✓ Working' },
              { value: 'BROKEN', label: '✗ Broken' },
              { value: 'UNCHECKED', label: '? Unchecked' },
            ] as const
          ).map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="linkStatus"
                value={value}
                checked={filters.linkStatus === value}
                onChange={() => onChange({ ...filters, linkStatus: value })}
                className="h-3.5 w-3.5"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* ── Quick filters ── */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Filters
        </h3>
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.isPinned === true}
              onChange={(e) =>
                onChange({ ...filters, isPinned: e.target.checked ? true : undefined })
              }
              className="h-3.5 w-3.5 rounded"
            />
            📌 Pinned only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.isFavourite === true}
              onChange={(e) =>
                onChange({ ...filters, isFavourite: e.target.checked ? true : undefined })
              }
              className="h-3.5 w-3.5 rounded"
            />
            ⭐ Favourites only
          </label>
        </div>
      </section>

      {/* ── Reset ── */}
      {(filters.tagIds.length > 0 ||
        filters.linkStatus !== '' ||
        filters.isPinned !== undefined ||
        filters.isFavourite !== undefined) && (
        <button
          type="button"
          onClick={() =>
            onChange({ tagIds: [], linkStatus: '', isPinned: undefined, isFavourite: undefined })
          }
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}
