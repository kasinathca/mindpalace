import React from 'react';
import { cn } from '../../utils/cn.js';

type NoticeVariant = 'error' | 'warning' | 'success' | 'info';
type NoticeSize = 'compact' | 'block';

interface InlineNoticeProps {
  message: string;
  variant?: NoticeVariant;
  size?: NoticeSize;
  className?: string;
  id?: string;
}

const variantClasses: Record<NoticeVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  success: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  info: 'border-primary/20 bg-primary/5 text-foreground',
};

const iconByVariant: Record<NoticeVariant, React.JSX.Element> = {
  error: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4m0 4h.01M10.29 3.86l-7.5 13a1 1 0 00.87 1.5h15a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z"
      />
    </svg>
  ),
  warning: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86l-7.5 13a1 1 0 00.87 1.5h15a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z"
      />
    </svg>
  ),
  success: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  info: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M12 22a10 10 0 100-20 10 10 0 000 20z"
      />
    </svg>
  ),
};

export function InlineNotice({
  message,
  variant = 'error',
  size = 'block',
  className,
  id,
}: InlineNoticeProps): React.JSX.Element {
  const ariaRole: 'alert' | 'status' = variant === 'error' ? 'alert' : 'status';
  const ariaLive: 'assertive' | 'polite' = variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      id={id}
      role={ariaRole}
      aria-live={ariaLive}
      className={cn(
        'rounded-md border',
        size === 'block' ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs',
        'flex items-start gap-2',
        variantClasses[variant],
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{iconByVariant[variant]}</span>
      <span>{message}</span>
    </div>
  );
}
