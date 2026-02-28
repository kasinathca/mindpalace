// ─────────────────────────────────────────────────────────────────────────────
// components/common/LoadingSpinner.tsx — Full-page loading indicator
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { cn } from '../../utils/cn.js';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({
  className,
  size = 'md',
}: LoadingSpinnerProps): React.ReactElement {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className,
      )}
    />
  );
}

export function FullPageSpinner(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
