// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/BookmarkDetailView.tsx — Full bookmark detail panel
//
// Renders full bookmark metadata, read-only permanent copy indicator,
// and the annotation list with add-note capability.
// This component is embedded in BookmarkDetailPage.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NoteCard } from './NoteCard.js';
import { EditBookmarkModal } from './EditBookmarkModal.js';
import { PermanentCopyViewer } from './PermanentCopyViewer.js';
import { Button } from '../ui/button.js';
import { apiCreateAnnotation, type AnnotationItem } from '../../api/annotations.api.js';
import type { BookmarkItem } from '../../api/bookmarks.api.js';

interface BookmarkDetailViewProps {
  bookmark: BookmarkItem;
  annotations: AnnotationItem[];
  onBookmarkUpdated?: (b: BookmarkItem) => void;
  onAnnotationUpdated?: (a: AnnotationItem) => void;
  onAnnotationDeleted?: (id: string) => void;
}

export function BookmarkDetailView({
  bookmark,
  annotations,
  onBookmarkUpdated,
  onAnnotationUpdated,
  onAnnotationDeleted,
}: BookmarkDetailViewProps): React.JSX.Element {
  const [editOpen, setEditOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'annotations' | 'saved-copy'>('annotations');

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace(/^www\./, '');
    } catch {
      return bookmark.url;
    }
  })();

  async function handleAddNote(): Promise<void> {
    if (!newNote.trim()) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      const created = await apiCreateAnnotation(bookmark.id, {
        type: 'NOTE',
        content: newNote.trim(),
      });
      onAnnotationUpdated?.(created);
      setNewNote('');
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : 'Failed to add note.');
    } finally {
      setAddingNote(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
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
          <div className="min-w-0 flex-1">
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
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
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

        {/* Status + metadata row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span
            className={`rounded-full px-2 py-0.5 font-medium capitalize ${
              bookmark.linkStatus === 'OK'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : bookmark.linkStatus === 'BROKEN'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {bookmark.linkStatus.toLowerCase()}
          </span>
          <span>{domain}</span>
          <span>Saved {new Date(bookmark.createdAt).toLocaleDateString()}</span>
          {bookmark.readAt && <span>Read {new Date(bookmark.readAt).toLocaleDateString()}</span>}
          {bookmark.isPinned && <span className="text-primary">Pinned</span>}
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

      {/* ── Tabbed section: Annotations / Saved Copy ─────────────── */}
      <section>
        {/* Tab headers */}
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

        {/* Saved Copy tab */}
        {activeTab === 'saved-copy' && <PermanentCopyViewer bookmark={bookmark} isOpen />}

        {/* Annotations tab */}
        {activeTab === 'annotations' && (
          <>
            {/* Existing notes */}
            {annotations.filter((a) => a.type === 'NOTE').length > 0 ? (
              <div className="mb-4 flex flex-col gap-3">
                {annotations
                  .filter((a) => a.type === 'NOTE')
                  .map((ann) => (
                    <NoteCard
                      key={ann.id}
                      annotation={ann}
                      bookmarkId={bookmark.id}
                      {...(onAnnotationUpdated ? { onUpdated: onAnnotationUpdated } : {})}
                      {...(onAnnotationDeleted ? { onDeleted: onAnnotationDeleted } : {})}
                    />
                  ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">No annotations yet.</p>
            )}

            {/* Add note form */}
            <div className="flex flex-col gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Add a note about this bookmark…"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {noteError && <p className="text-xs text-destructive">{noteError}</p>}
              <Button
                size="sm"
                onClick={() => void handleAddNote()}
                disabled={addingNote || !newNote.trim()}
              >
                {addingNote ? 'Adding…' : 'Add Note'}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ── Navigate back ─────────────────────────────────────────────── */}
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to library
      </Link>

      {/* ── Edit modal ────────────────────────────────────────────────── */}
      <EditBookmarkModal
        open={editOpen}
        onOpenChange={setEditOpen}
        bookmark={bookmark}
        {...(onBookmarkUpdated ? { onSaved: onBookmarkUpdated } : {})}
      />
    </div>
  );
}
