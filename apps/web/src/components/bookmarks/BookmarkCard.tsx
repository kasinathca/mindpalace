// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/BookmarkCard.tsx — Bookmark display card
//
// Displays: cover image, favicon, title, domain, description snippet, tags.
// Actions:  toggle favourite, toggle pinned, delete (with confirmation).
// Memoized with React.memo to avoid unnecessary re-renders.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarksStore } from '../../stores/bookmarksStore.js';
import { EditBookmarkModal } from './EditBookmarkModal.js';
import { cn } from '../../utils/cn.js';
import type { BookmarkItem } from '../../api/bookmarks.api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ── StarIcon ──────────────────────────────────────────────────────────────────

function StarIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'h-4 w-4',
        filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
      )}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

// ── LinkStatusDot ──────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  OK: 'bg-green-500',
  BROKEN: 'bg-red-500',
  REDIRECTED: 'bg-amber-500',
  UNCHECKED: 'bg-muted-foreground/30',
};

const STATUS_LABELS: Record<string, string> = {
  OK: 'Link OK',
  BROKEN: 'Link broken',
  REDIRECTED: 'Link redirected',
  UNCHECKED: 'Link not yet checked',
};

function LinkStatusDot({ status }: { status: string }): React.JSX.Element {
  const color = STATUS_CLASSES[status] ?? STATUS_CLASSES['UNCHECKED']!;
  const label = STATUS_LABELS[status] ?? 'Unknown status';
  return (
    <span
      className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${color}`}
      title={label}
      aria-label={label}
    />
  );
}

// ── BookmarkCard ──────────────────────────────────────────────────────────────

interface BookmarkCardProps {
  bookmark: BookmarkItem;
  view?: 'grid' | 'list';
  /** When provided, a checkbox appears and clicking it toggles selection. */
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const BookmarkCard = React.memo(function BookmarkCard({
  bookmark,
  view = 'grid',
  isSelected = false,
  onToggleSelect,
}: BookmarkCardProps): React.JSX.Element {
  const { updateBookmark, deleteBookmark } = useBookmarksStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const domain = getDomain(bookmark.url);

  async function toggleFavourite(e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    await updateBookmark(bookmark.id, { isFavourite: !bookmark.isFavourite });
  }

  async function handleDelete(e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${bookmark.title}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteBookmark(bookmark.id);
    } finally {
      setIsDeleting(false);
    }
  }

  if (view === 'list') {
    return (
      <>
        <div
          className={cn(
            'group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40',
            isDeleting && 'opacity-50',
            isSelected && 'border-primary ring-1 ring-primary/40',
          )}
        >
          {/* Selection checkbox (shown only when multi-select mode is active) */}
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(bookmark.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 flex-shrink-0 cursor-pointer rounded"
              aria-label={`Select "${bookmark.title}"`}
            />
          )}

          {/* Favicon */}
          <img
            src={bookmark.faviconUrl ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="h-5 w-5 flex-shrink-0 rounded-sm object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
            }}
          />

          {/* Title + domain */}
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="truncate text-sm font-medium">{bookmark.title}</p>
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs text-muted-foreground">{domain}</p>
              <LinkStatusDot status={bookmark.linkStatus} />
            </div>
          </a>

          {/* Tags */}
          <div className="hidden items-center gap-1 md:flex">
            {bookmark.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                style={tag.color ? { borderColor: tag.color, color: tag.color } : {}}
              >
                {tag.name}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              to={`/bookmarks/${bookmark.id}`}
              aria-label="View details"
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {/* Eye icon */}
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </Link>
            <button
              type="button"
              aria-label={bookmark.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              onClick={(e) => void toggleFavourite(e)}
              className="rounded p-1 hover:bg-accent"
            >
              <StarIcon filled={bookmark.isFavourite} />
            </button>
            <button
              type="button"
              aria-label="Edit bookmark"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditOpen(true);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              {/* Pencil icon */}
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Delete bookmark"
              onClick={(e) => void handleDelete(e)}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
        <EditBookmarkModal open={editOpen} onOpenChange={setEditOpen} bookmark={bookmark} />
      </>
    );
  }

  // Grid view (default)
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md',
        isDeleting && 'opacity-50',
        bookmark.isPinned && 'ring-1 ring-primary/30',
        isSelected && 'border-primary ring-2 ring-primary/40',
      )}
    >
      {/* Selection checkbox (shown on hover or when selected) */}
      {onToggleSelect && (
        <div
          className={cn(
            'absolute left-2 top-2 z-10 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(bookmark.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer rounded bg-background/80 shadow"
            aria-label={`Select "${bookmark.title}"`}
          />
        </div>
      )}
      {/* Cover image */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={bookmark.title}
      >
        {bookmark.coverImageUrl ? (
          <img
            src={bookmark.coverImageUrl}
            alt=""
            className="h-36 w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-36 items-center justify-center bg-muted">
            <span className="text-4xl font-bold text-muted-foreground/20 select-none">
              {domain.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </a>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Favicon + domain */}
        <div className="flex items-center gap-1.5">
          <img
            src={bookmark.faviconUrl ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            className="h-4 w-4 flex-shrink-0 rounded-sm object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
            }}
          />
          <span className="truncate text-xs text-muted-foreground">{domain}</span>
          <LinkStatusDot status={bookmark.linkStatus} />
          {bookmark.isPinned && (
            <span className="ml-auto text-xs text-primary" title="Pinned">
              📌
            </span>
          )}
        </div>

        {/* Title */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
        >
          {bookmark.title}
        </a>

        {/* Description */}
        {bookmark.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {truncate(bookmark.description, 120)}
          </p>
        )}

        {/* Tags */}
        {bookmark.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {bookmark.tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                style={tag.color ? { backgroundColor: `${tag.color}22`, color: tag.color } : {}}
              >
                {tag.name}
              </span>
            ))}
            {bookmark.tags.length > 4 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{bookmark.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover action bar */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          to={`/bookmarks/${bookmark.id}`}
          aria-label="View details"
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-background/80 p-1.5 shadow-sm backdrop-blur-sm hover:bg-background"
        >
          {/* Eye icon */}
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </Link>
        <button
          type="button"
          aria-label={bookmark.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          onClick={(e) => void toggleFavourite(e)}
          className="rounded-full bg-background/80 p-1.5 shadow-sm backdrop-blur-sm hover:bg-background"
        >
          <StarIcon filled={bookmark.isFavourite} />
        </button>
        <button
          type="button"
          aria-label="Edit bookmark"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditOpen(true);
          }}
          className="rounded-full bg-background/80 p-1.5 shadow-sm backdrop-blur-sm hover:bg-background"
        >
          {/* Pencil icon */}
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
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Delete bookmark"
          onClick={(e) => void handleDelete(e)}
          className="rounded-full bg-background/80 p-1.5 shadow-sm backdrop-blur-sm hover:bg-background hover:text-destructive"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <EditBookmarkModal open={editOpen} onOpenChange={setEditOpen} bookmark={bookmark} />
    </div>
  );
});
