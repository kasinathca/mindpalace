// ─────────────────────────────────────────────────────────────────────────────
// pages/BookmarkDetailPage.tsx — Single bookmark detail view
//
// Displays full bookmark metadata, annotations (highlights + notes), and the
// permanent copy viewer. Reached via /bookmarks/:id.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGetBookmark } from '../api/bookmarks.api.js';
import { apiListAnnotations } from '../api/annotations.api.js';
import { NoteCard } from '../components/bookmarks/NoteCard.js';
import { PermanentCopyViewer } from '../components/bookmarks/PermanentCopyViewer.js';
import { AnnotationToolbar } from '../components/bookmarks/AnnotationToolbar.js';
import { FullPageSpinner } from '../components/common/LoadingSpinner.js';
import type { BookmarkItem } from '../api/bookmarks.api.js';
import type { AnnotationItem } from '../api/annotations.api.js';

export default function BookmarkDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bookmark, setBookmark] = useState<BookmarkItem | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'annotations' | 'saved-copy'>('annotations');

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [bm, anns] = await Promise.all([apiGetBookmark(id), apiListAnnotations(id)]);
      setBookmark(bm);
      setAnnotations(anns);
    } catch {
      setError('Bookmark not found or you do not have access to it.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) return <FullPageSpinner />;

  if (error || !bookmark) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium text-destructive">{error ?? 'Bookmark not found.'}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  // Show all annotation types (NOTE and HIGHLIGHT) — NoteCard handles both
  const allAnnotations = annotations;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>›</span>
        <span className="truncate font-medium text-foreground">{bookmark.title}</span>
      </nav>

      {/* ── Metadata card ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {/* Cover image */}
        {bookmark.coverImageUrl && (
          <img
            src={bookmark.coverImageUrl}
            alt=""
            className="mb-4 h-48 w-full rounded-lg object-cover"
          />
        )}

        {/* Favicon + title + domain */}
        <div className="mb-3 flex items-start gap-3">
          {bookmark.faviconUrl && (
            <img src={bookmark.faviconUrl} alt="" className="mt-0.5 h-5 w-5 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-snug">{bookmark.title}</h1>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block truncate text-sm text-primary hover:underline"
            >
              {bookmark.url}
            </a>
          </div>
        </div>

        {/* Description */}
        {bookmark.description && (
          <p className="mb-4 text-sm text-muted-foreground">{bookmark.description}</p>
        )}

        {/* Tags */}
        {bookmark.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                style={tag.color ? { backgroundColor: tag.color + '33', color: tag.color } : {}}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              bookmark.linkStatus === 'OK'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : bookmark.linkStatus === 'BROKEN'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {bookmark.linkStatus}
          </span>
          <span>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</span>
          {bookmark.readAt && <span>Read {new Date(bookmark.readAt).toLocaleDateString()}</span>}
        </div>

        {/* Personal notes */}
        {bookmark.notes && (
          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your notes
            </p>
            <p className="whitespace-pre-wrap text-sm">{bookmark.notes}</p>
          </div>
        )}
      </div>

      {/* ── Tabbed section ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-4 flex gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('annotations')}
            className={`px-3 pb-2 text-sm font-medium transition-colors ${
              activeTab === 'annotations'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annotations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved-copy')}
            className={`px-3 pb-2 text-sm font-medium transition-colors ${
              activeTab === 'saved-copy'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Saved Copy
          </button>
        </div>

        {activeTab === 'saved-copy' && (
          <div className="relative">
            {/* AnnotationToolbar floats over the text when user selects text */}
            <AnnotationToolbar
              bookmarkId={bookmark.id}
              onCreated={(newAnnotation) => {
                setAnnotations((prev) => [...prev, newAnnotation]);
                setActiveTab('annotations');
              }}
            />
            <PermanentCopyViewer bookmark={bookmark} isOpen />
          </div>
        )}

        {activeTab === 'annotations' && (
          <>
            {allAnnotations.length > 0 ? (
              <div className="flex flex-col gap-3">
                {allAnnotations.map((ann) => (
                  <NoteCard
                    key={ann.id}
                    annotation={ann}
                    bookmarkId={bookmark.id}
                    onUpdated={(updated) =>
                      setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                    }
                    onDeleted={(deletedId) =>
                      setAnnotations((prev) => prev.filter((a) => a.id !== deletedId))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No annotations yet. Switch to the <strong>Saved Copy</strong> tab and select
                text to highlight or add a note.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
