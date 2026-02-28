// ─────────────────────────────────────────────────────────────────────────────
// components/common/EmptyState.tsx — Zero-content placeholder
//
// Displayed whenever a list has no items to show. Accepts an optional action
// button so users can immediately resolve the empty state (e.g. "Add a bookmark").
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { cn } from '../../utils/cn.js';

interface EmptyStateProps {
  /** Main heading text, e.g. "No bookmarks yet". */
  title: string;
  /** Secondary text giving context or a suggestion. */
  description?: string;
  /** Optional icon rendered above the title. Pass an SVG element. */
  icon?: React.ReactNode;
  /** Optional call-to-action rendered below the description. */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
      aria-live="polite"
    >
      {icon && (
        <div className="text-muted-foreground opacity-50" aria-hidden="true">
          {icon}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
