// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/NoteCard.tsx
//
// Renders a single annotation (highlight or note) as a card.
// Supports inline editing and deletion.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  apiUpdateAnnotation,
  apiDeleteAnnotation,
  type AnnotationItem,
} from '../../api/annotations.api.js';
import { getUserFriendlyErrorMessage } from '../../utils/apiError.js';
import { Button } from '../ui/button.js';
import { InlineNotice } from '../common/InlineNotice.js';

interface NoteCardProps {
  bookmarkId: string;
  annotation: AnnotationItem;
  onDeleted?: (id: string) => void;
  onUpdated?: (annotation: AnnotationItem) => void;
}

export function NoteCard({
  bookmarkId,
  annotation,
  onDeleted,
  onUpdated,
}: NoteCardProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    if (!editContent.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateAnnotation(bookmarkId, annotation.id, {
        content: editContent,
      });
      onUpdated?.(updated);
      setEditing(false);
    } catch (err: unknown) {
      setError(getUserFriendlyErrorMessage(err, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm('Delete this annotation?')) return;
    try {
      await apiDeleteAnnotation(bookmarkId, annotation.id);
      onDeleted?.(annotation.id);
    } catch {
      // ignore
    }
  }

  const isHighlight = annotation.type === 'HIGHLIGHT';

  return (
    <div
      className="group relative rounded-lg border border-border bg-card p-3"
      style={
        isHighlight && annotation.color
          ? { borderLeftWidth: 3, borderLeftColor: annotation.color }
          : undefined
      }
    >
      {/* Type badge */}
      <span className="mb-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
        {annotation.type.toLowerCase()}
      </span>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full resize-none rounded border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            aria-label="Edit annotation content"
            autoFocus
          />
          {error && <InlineNotice message={error} variant="error" size="compact" />}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setEditContent(annotation.content);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground">{annotation.content}</p>
      )}

      {/* Hover actions */}
      {!editing && (
        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit annotation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-9 9H9v-3z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete annotation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001-1h4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(annotation.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
