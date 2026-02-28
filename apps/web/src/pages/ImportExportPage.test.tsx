// ─────────────────────────────────────────────────────────────────────────────
// pages/ImportExportPage.test.tsx — Unit tests for ImportExportPage component
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../api/client.js', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import ImportExportPage from './ImportExportPage.js';
import { apiClient } from '../api/client.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ImportExportPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ImportExportPage — rendering', () => {
  it('renders the Import bookmarks heading', () => {
    renderPage();
    expect(screen.getByText('Import bookmarks')).toBeDefined();
  });

  it('renders the Export bookmarks heading', () => {
    renderPage();
    expect(screen.getByText('Export bookmarks')).toBeDefined();
  });

  it('renders the file upload input', () => {
    renderPage();
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeTruthy();
    expect(fileInput?.accept).toContain('.html');
  });

  it('import button is disabled when no file is selected', () => {
    renderPage();
    const importBtn = screen.getByRole('button', { name: /import/i });
    expect((importBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders Export as JSON button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /export as json/i })).toBeDefined();
  });

  it('renders Export as HTML button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /export as html/i })).toBeDefined();
  });
});

// ── File selection ─────────────────────────────────────────────────────────────

describe('ImportExportPage — file selection', () => {
  it('enables the import button when a file is selected', async () => {
    renderPage();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['<!DOCTYPE NETSCAPE-Bookmark-file-1>'], 'bookmarks.html', {
      type: 'text/html',
    });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      const importBtn = screen.getByRole('button', { name: /import/i }) as HTMLButtonElement;
      expect(importBtn.disabled).toBe(false);
    });
  });

  it('shows the selected file name on the upload area', async () => {
    renderPage();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['content'], 'my-bookmarks.html', { type: 'text/html' });

    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('my-bookmarks.html')).toBeDefined();
    });
  });
});

// ── Import ─────────────────────────────────────────────────────────────────────

describe('ImportExportPage — import', () => {
  it('shows import result summary on successful upload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: { imported: 42, skipped: 3, errors: [] },
      },
    });

    renderPage();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['content'], 'bookmarks.html', { type: 'text/html' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fireEvent.change(fileInput);

    await waitFor(() => {
      const importBtn = screen.getByRole('button', { name: /import/i }) as HTMLButtonElement;
      expect(importBtn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText(/import complete/i)).toBeDefined();
      expect(screen.getByText(/42 bookmarks imported/i)).toBeDefined();
      expect(screen.getByText(/3 duplicates? skipped/i)).toBeDefined();
    });
  });

  it('shows error message on failed upload', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

    renderPage();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['content'], 'bookmarks.html', { type: 'text/html' });
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
    fireEvent.change(fileInput);

    await waitFor(() => {
      const importBtn = screen.getByRole('button', { name: /import/i }) as HTMLButtonElement;
      expect(importBtn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeDefined();
    });
  });
});
