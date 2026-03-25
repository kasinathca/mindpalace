// ─────────────────────────────────────────────────────────────────────────────
// components/collections/CollectionTree.tsx — Recursive collection tree
//
// Renders the nested collection hierarchy in the sidebar.
// Supports:
//   • Expand / collapse nodes
//   • Visual indent per depth level
//   • Bookmark count badge
//   • Highlighted selected node
//   • Create child collection (➕ button on hover)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollectionsStore } from '../../stores/collectionsStore.js';
import { cn } from '../../utils/cn.js';
import type { CollectionNode } from '../../api/collections.api.js';

// ── ChevronRight icon ─────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform',
        open && 'rotate-90',
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ── Single tree node ──────────────────────────────────────────────────────────
interface TreeNodeProps {
  node: CollectionNode;
  depth: number;
  onCreateChild: (parentId: string) => void;
}

function TreeNode({ node, depth, onCreateChild }: TreeNodeProps): React.JSX.Element {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { selectedId, selectCollection } = useCollectionsStore();
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={cn(
          'group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm',
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent',
        )}
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
        onClick={() => {
          selectCollection(node.id);
          void navigate('/dashboard');
          if (hasChildren) setExpanded((v) => !v);
        }}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {/* Chevron (only if has children) */}
        <span className="flex h-4 w-4 items-center justify-center">
          {hasChildren ? (
            <ChevronIcon open={expanded} />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          )}
        </span>

        {/* Collection icon / color dot */}
        {node.color ? (
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: node.color }}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
            />
          </svg>
        )}

        {/* Name */}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        {/* Bookmark count */}
        {node._count.bookmarks > 0 && (
          <span className="ml-auto flex-shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {node._count.bookmarks}
          </span>
        )}

        {/* Add child button (visible on hover) */}
        <button
          type="button"
          aria-label={`Add collection inside ${node.name}`}
          className="ml-0.5 hidden rounded p-0.5 hover:bg-accent-foreground/10 group-hover:block"
          onClick={(e) => {
            e.stopPropagation();
            onCreateChild(node.id);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Recursive children */}
      {hasChildren && expanded && (
        <ul role="group">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onCreateChild={onCreateChild} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── CollectionTree root ───────────────────────────────────────────────────────

interface CollectionTreeProps {
  onCreateCollection?: (parentId?: string) => void;
}

export function CollectionTree({ onCreateCollection }: CollectionTreeProps): React.JSX.Element {
  const navigate = useNavigate();
  const { tree, isLoading, selectedId, selectCollection } = useCollectionsStore();

  if (isLoading && tree.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-muted-foreground animate-pulse">
        Loading collections…
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-muted-foreground">
        No collections yet.{' '}
        {onCreateCollection && (
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => onCreateCollection()}
          >
            Create one
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-0.5" role="tree" aria-label="Collections">
      {/* All Bookmarks (no collection filter) */}
      <li>
        <div
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
            selectedId === null
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-foreground hover:bg-accent',
          )}
          onClick={() => {
            selectCollection(null);
            void navigate('/dashboard');
          }}
          role="treeitem"
          aria-selected={selectedId === null}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <span>All Bookmarks</span>
        </div>
      </li>

      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          onCreateChild={(parentId) => onCreateCollection?.(parentId)}
        />
      ))}
    </ul>
  );
}
