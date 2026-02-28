// ─────────────────────────────────────────────────────────────────────────────
// components/bookmarks/NoteCard.test.tsx — Unit tests for the NoteCard component
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteCard } from './NoteCard.js';
import type { AnnotationItem } from '../../api/annotations.api.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../api/annotations.api.js', () => ({
  apiUpdateAnnotation: vi.fn(),
  apiDeleteAnnotation: vi.fn(),
}));

import { apiUpdateAnnotation, apiDeleteAnnotation } from '../../api/annotations.api.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockHighlight: AnnotationItem = {
  id: 'ann_01',
  type: 'HIGHLIGHT',
  content: 'This is a highlighted passage.',
  positionData: { startOffset: 10, endOffset: 40 },
  color: '#FDE047',
  isPublic: false,
  permanentCopyId: 'copy_01',
  userId: 'user_01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockNote: AnnotationItem = {
  ...mockHighlight,
  id: 'ann_02',
  type: 'NOTE',
  content: 'This is a note I wrote.',
  color: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('NoteCard — rendering', () => {
  it('renders annotation content', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    expect(screen.getByText('This is a highlighted passage.')).toBeDefined();
  });

  it('shows type badge matching annotation type', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    expect(screen.getByText('highlight')).toBeDefined();
  });

  it('shows "note" badge for note type', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockNote} />);
    expect(screen.getByText('note')).toBeDefined();
  });

  it('renders creation date', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    // Date rendering — just assert a date string is present in the card
    const card = document.querySelector('.text-xs.text-muted-foreground');
    expect(card).toBeTruthy();
  });
});

// ── Edit mode ─────────────────────────────────────────────────────────────────

describe('NoteCard — edit', () => {
  it('shows textarea when edit button is clicked', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    const editBtn = screen.getByRole('button', { name: /edit annotation/i });
    fireEvent.click(editBtn);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDefined();
  });

  it('pre-fills textarea with existing content', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    fireEvent.click(screen.getByRole('button', { name: /edit annotation/i }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('This is a highlighted passage.');
  });

  it('calls apiUpdateAnnotation on save and invokes onUpdated callback', async () => {
    const updated = { ...mockHighlight, content: 'Updated content' };
    vi.mocked(apiUpdateAnnotation).mockResolvedValue(updated);
    const onUpdated = vi.fn();

    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} onUpdated={onUpdated} />);
    fireEvent.click(screen.getByRole('button', { name: /edit annotation/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(apiUpdateAnnotation).toHaveBeenCalledWith('bm_01', 'ann_01', {
        content: 'Updated content',
      });
      expect(onUpdated).toHaveBeenCalledWith(updated);
    });
  });

  it('cancels edit mode without saving when Cancel is clicked', () => {
    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    fireEvent.click(screen.getByRole('button', { name: /edit annotation/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

describe('NoteCard — delete', () => {
  it('calls apiDeleteAnnotation and onDeleted after confirm=true', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.mocked(apiDeleteAnnotation).mockResolvedValue(undefined);
    const onDeleted = vi.fn();

    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: /delete annotation/i }));

    await waitFor(() => {
      expect(apiDeleteAnnotation).toHaveBeenCalledWith('bm_01', 'ann_01');
      expect(onDeleted).toHaveBeenCalledWith('ann_01');
    });

    vi.unstubAllGlobals();
  });

  it('does NOT call apiDeleteAnnotation when confirm=false', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));

    render(<NoteCard bookmarkId="bm_01" annotation={mockHighlight} />);
    fireEvent.click(screen.getByRole('button', { name: /delete annotation/i }));

    expect(apiDeleteAnnotation).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
