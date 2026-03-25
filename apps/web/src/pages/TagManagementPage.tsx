// ─────────────────────────────────────────────────────────────────────────────
// pages/TagManagementPage.tsx — Create, rename, re-colour, merge, delete tags
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTagsStore } from '../stores/tagsStore.js';
import type { TagItem } from '../api/tags.api.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { InlineNotice } from '../components/common/InlineNotice.js';
import { getUserFriendlyErrorMessage } from '../utils/apiError.js';
import { useUiStore } from '../stores/uiStore.js';

// ── Colour picker swatches ────────────────────────────────────────────────────

const SWATCHES = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#64748B',
];

// ── Inline tag row ────────────────────────────────────────────────────────────

interface TagRowProps {
  tag: TagItem;
  onSelect: (id: string) => void;
  isSelected: boolean;
  selectionDisabled?: boolean;
}

function TagRow({
  tag,
  onSelect,
  isSelected,
  selectionDisabled = false,
}: TagRowProps): React.JSX.Element {
  const { updateTag, deleteTag } = useTagsStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color ?? '');
  const [saving, setSaving] = useState(false);

  async function saveEdit(): Promise<void> {
    setSaving(true);
    try {
      await updateTag(tag.id, {
        name: editName || tag.name,
        color: editColor || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all bookmarks.`)) return;
    await deleteTag(tag.id);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors
        ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
    >
      {/* Select for merge */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(tag.id)}
        disabled={selectionDisabled}
        className="h-4 w-4 rounded"
        aria-label={`Select tag ${tag.name} for bulk actions`}
      />

      {/* Colour dot */}
      <span
        className="h-3 w-3 flex-shrink-0 rounded-full ring-1 ring-border"
        style={{ backgroundColor: tag.color ?? '#94a3b8' }}
      />

      {editing ? (
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="h-7 text-sm"
            autoFocus
          />
          <div className="flex flex-wrap gap-1">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setEditColor(swatch)}
                className={`h-5 w-5 rounded-full ring-offset-1 transition-transform hover:scale-110
                  ${editColor === swatch ? 'ring-2 ring-primary' : ''}`}
                style={{ backgroundColor: swatch }}
                aria-label={`Color ${swatch}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setEditColor('')}
              className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
            >
              none
            </button>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void saveEdit()} disabled={saving}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium">{tag.name}</span>
          <span className="text-xs text-muted-foreground">{tag.bookmarkCount}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit tag"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete tag"
          >
            🗑
          </button>
        </>
      )}
    </div>
  );
}

// ── TagManagementPage ─────────────────────────────────────────────────────────

export default function TagManagementPage(): React.ReactElement {
  const { tags, isLoading, error, fetchTags, createTag, mergeTags, deleteTag } = useTagsStore();
  const addToast = useUiStore((s) => s.addToast);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [mergeError, setMergeError] = useState('');

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createTag(
        newColor ? { name: newName.trim(), color: newColor } : { name: newName.trim() },
      );
      setNewName('');
      setNewColor('');
    } finally {
      setCreating(false);
    }
  }

  function toggleSelectForMerge(id: string): void {
    if (id === mergeTargetId) {
      setMergeError('A merge target cannot also be a source tag.');
      return;
    }
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll(): void {
    if (selectedTagIds.length === tags.length) {
      setSelectedTagIds([]);
      return;
    }
    const ids = tags.map((t) => t.id).filter((id) => id !== mergeTargetId);
    setSelectedTagIds(ids);
  }

  async function handleDeleteSelected(): Promise<void> {
    if (selectedTagIds.length === 0) return;

    const ok = window.confirm(
      `Delete ${selectedTagIds.length} selected tag(s)? They will be removed from all bookmarks.`,
    );
    if (!ok) return;

    setIsBulkDeleting(true);
    setMergeError('');
    try {
      await Promise.all(selectedTagIds.map(async (id) => deleteTag(id)));
      addToast({
        title: 'Tags deleted',
        description: `${selectedTagIds.length} selected tag(s) were removed.`,
        variant: 'success',
      });
      setSelectedTagIds([]);
      setMergeTargetId('');
    } catch (err) {
      setMergeError(getUserFriendlyErrorMessage(err, 'Failed to delete selected tags.'));
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleMerge(): Promise<void> {
    if (!mergeTargetId) {
      setMergeError('Please select a target tag.');
      return;
    }
    if (selectedTagIds.length === 0) {
      setMergeError('Select at least one source tag.');
      return;
    }
    setMergeError('');
    setIsMerging(true);
    try {
      await mergeTags({ sourceIds: selectedTagIds, targetId: mergeTargetId });
      addToast({
        title: 'Tags merged',
        description: `${selectedTagIds.length} tag(s) were merged successfully.`,
        variant: 'success',
      });
      setSelectedTagIds([]);
      setMergeTargetId('');
    } finally {
      setIsMerging(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Manage Tags</h1>

      {/* ── Create tag ── */}
      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          New Tag
        </h2>
        <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Tag name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
              required
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setNewColor(newColor === swatch ? '' : swatch)}
                className={`h-6 w-6 rounded-full ring-offset-1 transition-transform hover:scale-110
                  ${newColor === swatch ? 'ring-2 ring-primary' : ''}`}
                style={{ backgroundColor: swatch }}
                aria-label={`Color ${swatch}`}
              />
            ))}
          </div>
          <Button type="submit" disabled={creating || !newName.trim()}>
            {creating ? 'Creating…' : 'Create Tag'}
          </Button>
        </form>
      </section>

      {/* ── Tag list ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Tags ({tags.length})
        </h2>

        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
            <span className="text-xs text-muted-foreground">{selectedTagIds.length} selected</span>
            <Button type="button" variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedTagIds.length === tags.length ? 'Clear all' : 'Select all'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedTagIds.length === 0 || isBulkDeleting}
              onClick={() => void handleDeleteSelected()}
            >
              {isBulkDeleting ? 'Deleting…' : `Delete Selected (${selectedTagIds.length})`}
            </Button>
            <span className="text-xs text-muted-foreground">
              Selection is also used for Merge below.
            </span>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading tags…</p>}
        {error && <InlineNotice message={error} variant="error" className="mb-3" />}
        {!isLoading && tags.length === 0 && (
          <EmptyState
            icon={<span className="text-3xl">🏷️</span>}
            title="No tags yet"
            description="Create your first tag above to organise your bookmarks."
          />
        )}

        <div className="flex flex-col gap-2">
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              isSelected={selectedTagIds.includes(tag.id)}
              onSelect={toggleSelectForMerge}
              selectionDisabled={tag.id === mergeTargetId}
            />
          ))}
        </div>
      </section>

      {/* ── Merge tags ── */}
      {tags.length > 1 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Merge Tags
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Check source tags above, pick a target below, then click Merge. Source tags will be
            deleted and their bookmarks will be re-tagged with the target.
          </p>

          {mergeError && (
            <InlineNotice message={mergeError} variant="error" size="compact" className="mb-2" />
          )}

          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="merge-target" className="text-sm">
              Merge into:
            </label>
            <select
              id="merge-target"
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— select target —</option>
              {tags
                .filter((t) => !selectedTagIds.includes(t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={
                isMerging || isBulkDeleting || selectedTagIds.length === 0 || !mergeTargetId
              }
              onClick={() => void handleMerge()}
            >
              {isMerging ? 'Merging…' : `Merge ${selectedTagIds.length} tag(s)`}
            </Button>
            {selectedTagIds.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setSelectedTagIds([])}>
                Clear selection
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
