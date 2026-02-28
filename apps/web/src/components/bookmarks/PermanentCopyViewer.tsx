// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/PermanentCopyViewer.tsx — Offline saved copy reader
//
// Fetches and renders the Readability-extracted article content for a bookmark.
// Handles three states: loading, not-yet-captured (queued), captured (success),
// and capture-failed.
//
// The component is lazy — it only fetches when `isOpen` becomes true.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  apiGetPermanentCopy,
  apiCheckLink,
  type PermanentCopyItem,
} from '../../api/bookmarks.api.js';
import { Button } from '../ui/button.js';
import type { BookmarkItem } from '../../api/bookmarks.api.js';

interface PermanentCopyViewerProps {
  bookmark: BookmarkItem;
  /** If false, nothing is fetched — used to defer loading until tab is opened */
  isOpen?: boolean;
}

type ViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not-found' } // 404 — copy queued or never attempted
  | { status: 'failed'; reason: string } // capture ran but errored
  | { status: 'ready'; copy: PermanentCopyItem };

export function PermanentCopyViewer({
  bookmark,
  isOpen = true,
}: PermanentCopyViewerProps): React.JSX.Element {
  const [state, setState] = useState<ViewState>({ status: 'idle' });
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const loadCopy = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const copy = await apiGetPermanentCopy(bookmark.id);
      if (copy.failureReason) {
        setState({ status: 'failed', reason: copy.failureReason });
      } else {
        setState({ status: 'ready', copy });
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({
          status: 'failed',
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }, [bookmark.id]);

  useEffect(() => {
    if (isOpen && state.status === 'idle') {
      void loadCopy();
    }
  }, [isOpen, state.status, loadCopy]);

  async function handleRecheck(): Promise<void> {
    setChecking(true);
    setCheckMsg(null);
    try {
      await apiCheckLink(bookmark.id);
      setCheckMsg('Link check queued. The status on this bookmark will update shortly.');
    } catch {
      setCheckMsg('Failed to queue link check. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  function handleRetryCapture(): void {
    setState({ status: 'idle' });
  }

  // ── Render states ───────────────────────────────────────────────────────────

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading saved copy…
      </div>
    );
  }

  if (state.status === 'not-found') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-secondary p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium">Capture in progress</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The permanent copy is being generated in the background. Check back soon.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadCopy()}>
          Refresh
        </Button>
      </div>
    );
  }

  if (state.status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-destructive">Capture failed</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{state.reason}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleRetryCapture()}>
          Retry
        </Button>
      </div>
    );
  }

  // ── Ready ───────────────────────────────────────────────────────────────────
  const { copy } = state;

  return (
    <div className="flex flex-col gap-4">
      {/* Metadata row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Captured {new Date(copy.capturedAt).toLocaleString()}
          {copy.sizeBytes !== null && ` · ${Math.round(copy.sizeBytes / 1024)} KB`}
        </span>
        <div className="flex items-center gap-2">
          {checkMsg && <span className="text-primary">{checkMsg}</span>}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => void handleRecheck()}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Recheck link'}
          </Button>
        </div>
      </div>

      {/* Article content */}
      {copy.articleContent ? (
        <article
          className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-card p-6"
          // Sanitized by DOMPurify on the server before storage
          dangerouslySetInnerHTML={{ __html: copy.articleContent }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No readable article content was extracted from this page.
        </p>
      )}
    </div>
  );
}
