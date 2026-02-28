// ─────────────────────────────────────────────────────────────────────────────
// components/layout/Sidebar.tsx — Left navigation sidebar
//
// Contains:
//   • App logo / branding
//   • Quick navigation links (Dashboard, Search, Tags, Import/Export, Settings)
//   • Collection tree (hierarchical)
//   • Add Collection button
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CollectionTree } from '../collections/CollectionTree.js';
import { Button } from '../ui/button.js';
import { useCollectionsStore } from '../../stores/collectionsStore.js';

interface SidebarProps {
  onClose?: () => void;
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
}): React.JSX.Element {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors
        ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export function Sidebar({ onClose }: SidebarProps): React.JSX.Element {
  const navigate = useNavigate();
  const { createCollection } = useCollectionsStore();
  const [creatingParentId, setCreatingParentId] = useState<string | undefined>(undefined);
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCreateCollection(parentId?: string): void {
    setCreatingParentId(parentId);
    setShowNewCollectionForm(true);
    setNewName('');
  }

  async function submitNewCollection(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      await createCollection({
        name,
        ...(creatingParentId ? { parentId: creatingParentId } : {}),
      });
      setShowNewCollectionForm(false);
      setNewName('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-border px-4">
        <button
          type="button"
          className="text-sm font-bold tracking-tight"
          onClick={() => navigate('/dashboard')}
        >
          🧠 Mind Palace
        </button>
      </div>

      {/* Quick nav */}
      <div className="flex-shrink-0 border-b border-border px-2 py-2 space-y-0.5">
        <NavItem
          to="/dashboard"
          label="Dashboard"
          onClick={onClose}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
              />
            </svg>
          }
        />
        <NavItem
          to="/search"
          label="Search"
          onClick={onClose}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z"
              />
            </svg>
          }
        />
        <NavItem
          to="/tags"
          label="Tags"
          onClick={onClose}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 7h.01M3 6a3 3 0 0 1 3-3h5.586a1 1 0 0 1 .707.293l6.414 6.414a1 1 0 0 1 0 1.414l-5.586 5.586a1 1 0 0 1-1.414 0L5.293 9.707A1 1 0 0 1 5 9V6z"
              />
            </svg>
          }
        />
        <NavItem
          to="/import-export"
          label="Import / Export"
          onClick={onClose}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m-4 4l4-4 4 4M4 8v1a2 2 0 002 2h12a2 2 0 002-2V8"
              />
            </svg>
          }
        />
      </div>

      {/* Collection tree */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <CollectionTree onCreateCollection={handleCreateCollection} />

        {/* Inline new collection form */}
        {showNewCollectionForm && (
          <form
            className="mt-2 flex items-center gap-1 px-2"
            onSubmit={(e) => void submitNewCollection(e)}
          >
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name…"
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowNewCollectionForm(false);
              }}
            />
            <button
              type="submit"
              className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
              disabled={isSubmitting || !newName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              className="rounded px-1 py-1 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => setShowNewCollectionForm(false)}
            >
              ✕
            </button>
          </form>
        )}
      </nav>

      {/* Footer: new collection + settings */}
      <div className="flex-shrink-0 border-t border-border p-3 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => handleCreateCollection(undefined)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Collection
        </Button>
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors
            ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </NavLink>
      </div>
    </div>
  );
}
