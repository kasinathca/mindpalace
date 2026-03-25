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
  apiGetPermanentCopyVersion,
  apiListPermanentCopyVersions,
  apiRefreshPermanentCopy,
  apiCheckLink,
  type PermanentCopyVersionSummary,
  type PermanentCopyItem,
} from '../../api/bookmarks.api.js';
import { getApiErrorStatus, getUserFriendlyErrorMessage } from '../../utils/apiError.js';
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
  const [versions, setVersions] = useState<PermanentCopyVersionSummary[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isRefreshingArchive, setIsRefreshingArchive] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'snapshot' | 'reader'>('snapshot');
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const loadCopy = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [copy, recentVersions] = await Promise.all([
        apiGetPermanentCopy(bookmark.id),
        apiListPermanentCopyVersions(bookmark.id),
      ]);
      setVersions(recentVersions);
      setSelectedVersionId(copy.id);
      if (copy.failureReason) {
        setState({ status: 'failed', reason: copy.failureReason });
      } else {
        setState({ status: 'ready', copy });
      }
    } catch (err: unknown) {
      const status = getApiErrorStatus(err);
      if (status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({
          status: 'failed',
          reason: getUserFriendlyErrorMessage(err, 'Unable to load saved copy right now.'),
        });
      }
    }
  }, [bookmark.id]);

  const loadSelectedVersion = useCallback(
    async (versionId: string) => {
      setState({ status: 'loading' });
      try {
        const copy = await apiGetPermanentCopyVersion(bookmark.id, versionId);
        setSelectedVersionId(versionId);
        if (copy.failureReason) {
          setState({ status: 'failed', reason: copy.failureReason });
        } else {
          setState({ status: 'ready', copy });
        }
      } catch (err: unknown) {
        const status = getApiErrorStatus(err);
        if (status === 404) {
          setState({ status: 'not-found' });
        } else {
          setState({
            status: 'failed',
            reason: getUserFriendlyErrorMessage(err, 'Unable to load saved copy version.'),
          });
        }
      }
    },
    [bookmark.id],
  );

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
    } catch (err) {
      setCheckMsg(
        getUserFriendlyErrorMessage(err, 'Failed to queue link check. Please try again.'),
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleRefreshArchive(): Promise<void> {
    setIsRefreshingArchive(true);
    setArchiveMsg(null);
    const baselineCapturedAt =
      state.status === 'ready' ? state.copy.capturedAt : (versions[0]?.capturedAt ?? null);

    try {
      await apiRefreshPermanentCopy(bookmark.id);

      let delayMs = 2_000;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const [latest, recentVersions] = await Promise.all([
          apiGetPermanentCopy(bookmark.id),
          apiListPermanentCopyVersions(bookmark.id),
        ]);

        const changed = baselineCapturedAt === null || latest.capturedAt !== baselineCapturedAt;
        if (changed) {
          setVersions(recentVersions);
          setSelectedVersionId(latest.id);
          setState({ status: 'ready', copy: latest });
          setArchiveMsg('Archive refreshed successfully.');
          return;
        }

        delayMs *= 2;
      }

      setArchiveMsg('Archive refresh queued. New snapshot may appear shortly due to rate limits.');
    } catch (err) {
      setArchiveMsg(getUserFriendlyErrorMessage(err, 'Failed to refresh archive.'));
    } finally {
      setIsRefreshingArchive(false);
    }
  }

  function renderSnapshotHtml(copy: PermanentCopyItem): string {
    if (!copy.rawHtml) {
      return '';
    }

    const withoutCspMeta = copy.rawHtml.replace(
      /<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi,
      '',
    );

    const baseHref = (copy.sourceUrl ?? bookmark.url).replace(/"/g, '&quot;');
    if (withoutCspMeta.toLowerCase().includes('<head')) {
      return withoutCspMeta.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
    }

    return `<!doctype html><html><head><base href="${baseHref}"></head><body>${withoutCspMeta}</body></html>`;
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
        <Button
          variant="default"
          size="sm"
          onClick={() => void handleRefreshArchive()}
          disabled={isRefreshingArchive}
        >
          {isRefreshingArchive ? 'Refreshing archive…' : 'Refresh Archive'}
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
        <Button
          variant="default"
          size="sm"
          onClick={() => void handleRefreshArchive()}
          disabled={isRefreshingArchive}
        >
          {isRefreshingArchive ? 'Refreshing archive…' : 'Refresh Archive'}
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
          {archiveMsg && <span className="text-primary">{archiveMsg}</span>}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void handleRefreshArchive()}
            disabled={isRefreshingArchive}
          >
            {isRefreshingArchive ? 'Refreshing archive…' : 'Refresh Archive'}
          </Button>
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

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label htmlFor="archive-version" className="text-muted-foreground">
          Archive version
        </label>
        <select
          id="archive-version"
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={selectedVersionId ?? ''}
          onChange={(e) => {
            const nextId = e.target.value;
            if (!nextId) return;
            void loadSelectedVersion(nextId);
          }}
          disabled={versions.length === 0}
        >
          {versions.length === 0 ? (
            <option value="">Current</option>
          ) : (
            versions.map((v, idx) => (
              <option key={v.id} value={v.id}>
                {idx === 0 ? 'Latest' : `Archive ${idx + 1}`} ·{' '}
                {new Date(v.capturedAt).toLocaleString()}
              </option>
            ))
          )}
        </select>

        <div className="ml-auto inline-flex items-center gap-1 rounded-md border border-border p-1">
          <Button
            type="button"
            variant={viewMode === 'snapshot' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('snapshot')}
          >
            Snapshot
          </Button>
          <Button
            type="button"
            variant={viewMode === 'reader' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('reader')}
          >
            Reader
          </Button>
        </div>
      </div>

      {/* Article content */}
      {viewMode === 'snapshot' ? (
        copy.rawHtml ? (
          <iframe
            title="Saved page snapshot"
            className="h-[70vh] w-full rounded-lg border border-border bg-white"
            sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts"
            srcDoc={renderSnapshotHtml(copy)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No full HTML snapshot is available for this archive yet.
          </p>
        )
      ) : copy.articleContent ? (
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
