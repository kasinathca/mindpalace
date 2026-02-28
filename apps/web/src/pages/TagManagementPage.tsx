// ─────────────────────────────────────────────────────────────────────────────
// pages/TagManagementPage.tsx — Create, rename, re-colour, merge, delete tags
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTagsStore } from '../stores/tagsStore.js';
import type { TagItem } from '../api/tags.api.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { EmptyState } from '../components/common/EmptyState.js';

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
}

function TagRow({ tag, onSelect, isSelected }: TagRowProps): React.JSX.Element {
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
        className="h-4 w-4 rounded"
        aria-label={`Select tag ${tag.name} for merge`}
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
  const { tags, isLoading, error, fetchTags, createTag, mergeTags } = useTagsStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
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
    setSelectedForMerge((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleMerge(): Promise<void> {
    if (!mergeTargetId) {
      setMergeError('Please select a target tag.');
      return;
    }
    if (selectedForMerge.length === 0) {
      setMergeError('Select at least one source tag.');
      return;
    }
    setMergeError('');
    setIsMerging(true);
    try {
      await mergeTags({ sourceIds: selectedForMerge, targetId: mergeTargetId });
      setSelectedForMerge([]);
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

        {isLoading && <p className="text-sm text-muted-foreground">Loading tags…</p>}
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
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
              isSelected={selectedForMerge.includes(tag.id)}
              onSelect={toggleSelectForMerge}
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

          {mergeError && <p className="mb-2 text-xs text-destructive">{mergeError}</p>}

          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm">Merge into:</label>
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— select target —</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isMerging || selectedForMerge.length === 0 || !mergeTargetId}
              onClick={() => void handleMerge()}
            >
              {isMerging ? 'Merging…' : `Merge ${selectedForMerge.length} tag(s)`}
            </Button>
            {selectedForMerge.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setSelectedForMerge([])}>
                Clear selection
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
