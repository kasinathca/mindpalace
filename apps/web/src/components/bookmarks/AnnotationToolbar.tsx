// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/AnnotationToolbar.tsx
//
// Floating toolbar that appears when the user selects text inside a
// PermanentCopy viewer. Lets them highlight the selection or add a note.
//
// Usage:
//   <AnnotationToolbar bookmarkId={id} onCreated={handleCreated} />
//   Mount this once inside the permanent-copy viewer container.
//   The component listens for selectionchange and positions itself accordingly.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiCreateAnnotation, type AnnotationItem } from '../../api/annotations.api.js';
import { Button } from '../ui/button.js';

// Highlight colour swatches (subset of HIGHLIGHT_COLOURS in constants.ts)
const COLOURS = ['#FDE047', '#86EFAC', '#93C5FD', '#F9A8D4', '#FCA5A5'];

interface SelectionInfo {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
}

interface AnnotationToolbarProps {
  bookmarkId: string;
  onCreated?: (annotation: AnnotationItem) => void;
}

export function AnnotationToolbar({
  bookmarkId,
  onCreated,
}: AnnotationToolbarProps): React.JSX.Element | null {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for text selection changes
  useEffect(() => {
    function handleSelectionChange(): void {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
        setSelection(null);
        setNoteMode(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString().trim(),
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        rect,
      });
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const saveAnnotation = useCallback(
    async (type: 'HIGHLIGHT' | 'NOTE', color?: string): Promise<void> => {
      if (!selection) return;
      setSaving(true);
      try {
        const annotation = await apiCreateAnnotation(bookmarkId, {
          type,
          content: type === 'NOTE' ? noteText || selection.text : selection.text,
          positionData: {
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
          },
          ...(color !== undefined ? { color } : {}),
        });
        onCreated?.(annotation);
        setSelection(null);
        setNoteMode(false);
        setNoteText('');
        window.getSelection()?.removeAllRanges();
      } catch {
        // ignore — user can retry
      } finally {
        setSaving(false);
      }
    },
    [bookmarkId, selection, noteText, onCreated],
  );

  if (!selection) return null;

  // Position toolbar above the selection
  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: selection.rect.top - 52,
    left: selection.rect.left + selection.rect.width / 2,
    transform: 'translateX(-50%)',
    zIndex: 50,
  };

  return (
    <div ref={containerRef} style={toolbarStyle}>
      {noteMode ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <textarea
            className="h-20 w-56 resize-none rounded border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Add a note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={saving || !noteText.trim()}
              onClick={() => void saveAnnotation('NOTE')}
            >
              {saving ? '…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNoteMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-lg">
          {/* Highlight with colour */}
          {COLOURS.map((colour) => (
            <button
              key={colour}
              type="button"
              title={`Highlight (${colour})`}
              onClick={() => void saveAnnotation('HIGHLIGHT', colour)}
              disabled={saving}
              className="h-5 w-5 rounded-full ring-offset-1 transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: colour }}
            />
          ))}
          {/* Note mode */}
          <button
            type="button"
            title="Add note"
            onClick={() => setNoteMode(true)}
            disabled={saving}
            className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Add note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
        </div>
      )}
    </div>
  );
}
