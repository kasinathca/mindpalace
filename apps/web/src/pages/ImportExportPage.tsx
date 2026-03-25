// ─────────────────────────────────────────────────────────────────────────────
// pages/ImportExportPage.tsx — Import from browser HTML / Export to JSON or HTML
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import { apiClient } from '../api/client.js';
import { Button } from '../components/ui/button.js';
import { InlineNotice } from '../components/common/InlineNotice.js';
import { useCollectionsStore } from '../stores/collectionsStore.js';
import { getUserFriendlyErrorMessage } from '../utils/apiError.js';

// ── Shared types ──────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ── Import section ────────────────────────────────────────────────────────────

function ImportSection(): React.JSX.Element {
  const fetchTree = useCollectionsStore((s) => s.fetchTree);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setResult(null);
    setError(null);
  }

  async function handleImport(): Promise<void> {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ success: true; data: ImportResult }>(
        '/api/v1/bookmarks/import',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setResult(res.data.data);
      await fetchTree();
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: unknown) {
      const message = getUserFriendlyErrorMessage(err, 'Import failed. Please try again.');
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-base font-semibold text-foreground">Import bookmarks</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Import bookmarks from any browser. Export your bookmarks from Chrome, Firefox, Safari, or
        Edge as an HTML file, then upload it here.
      </p>

      {/* File drop area */}
      <label
        htmlFor="bookmark-file"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4"
          />
        </svg>
        {file ? (
          <span className="text-sm font-medium text-foreground">{file.name}</span>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">
              Click to upload or drag and drop
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Netscape Bookmark HTML file (.html)
            </span>
          </>
        )}
        <input
          id="bookmark-file"
          ref={fileRef}
          type="file"
          accept=".html,.htm"
          className="sr-only"
          onChange={handleFileChange}
        />
      </label>

      {error && <InlineNotice message={error} variant="error" className="mt-3" />}

      {result && (
        <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
          <p className="font-medium">Import complete</p>
          <ul className="mt-1 list-disc pl-4">
            <li>
              {result.imported} bookmark{result.imported !== 1 ? 's' : ''} imported
            </li>
            <li>
              {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped
            </li>
            {result.errors.length > 0 && (
              <li>
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} (see console)
              </li>
            )}
          </ul>
        </div>
      )}

      <Button className="mt-4" disabled={!file || uploading} onClick={() => void handleImport()}>
        {uploading ? 'Importing…' : 'Import'}
      </Button>
    </div>
  );
}

// ── Export section ────────────────────────────────────────────────────────────

function ExportSection(): React.JSX.Element {
  const [exporting, setExporting] = useState<'json' | 'html' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: 'json' | 'html'): Promise<void> {
    setExporting(format);
    setError(null);
    try {
      const res = await apiClient.get<Blob>(`/api/v1/bookmarks/export?format=${format}`, {
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] as string | undefined;
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `mindpalace-bookmarks.${format}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(getUserFriendlyErrorMessage(err, 'Export failed. Please try again.'));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-base font-semibold text-foreground">Export bookmarks</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Download all your bookmarks as a file. JSON format includes tags, notes, and metadata. HTML
        format is compatible with all major browsers for re-import.
      </p>

      {error && <InlineNotice message={error} variant="error" className="mb-3" />}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={exporting !== null}
          onClick={() => void handleExport('json')}
        >
          {exporting === 'json' ? 'Exporting…' : 'Export as JSON'}
        </Button>
        <Button
          variant="outline"
          disabled={exporting !== null}
          onClick={() => void handleExport('html')}
        >
          {exporting === 'html' ? 'Exporting…' : 'Export as HTML'}
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportExportPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Import &amp; Export</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Bring bookmarks in from any browser, or take your library with you.
      </p>
      <div className="space-y-6">
        <ImportSection />
        <ExportSection />
      </div>
    </div>
  );
}
