// ─────────────────────────────────────────────────────────────────────────────
// components/common/TagBadge.tsx — Inline tag label with optional colour dot
//
// Renders a compact badge for a single tag. Used in BookmarkCard, search
// results, and the TagManagementPage.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { cn } from '../../utils/cn.js';

interface TagBadgeProps {
  name: string;
  /** Optional hex colour for the left-hand colour dot, e.g. "#6366F1". */
  color?: string | null;
  /** When true, clicking the badge calls onRemove instead of navigating. */
  removable?: boolean;
  /** Called when the × button is clicked (only rendered when removable=true). */
  onRemove?: () => void;
  /** onClick handler for navigating to the tag filter view. */
  onClick?: () => void;
  className?: string;
}

export function TagBadge({
  name,
  color,
  removable = false,
  onRemove,
  onClick,
  className,
}: TagBadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground',
        onClick && 'cursor-pointer hover:bg-accent transition-colors',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {color && (
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {name}
      {removable && onRemove && (
        <button
          type="button"
          aria-label={`Remove tag ${name}`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive focus:outline-none focus:ring-1 focus:ring-ring"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-2.5 w-2.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
