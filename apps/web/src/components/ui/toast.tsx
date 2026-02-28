// ─────────────────────────────────────────────────────────────────────────────
// components/ui/toast.tsx — Toast notifications (Radix UI)
//
// Reads from uiStore.toasts and renders a Radix Toast viewport at the bottom-
// right of the screen. Each toast auto-dismisses after its `duration` (default
// 4000 ms). Variant colours match the design system (success, error, warning).
// ─────────────────────────────────────────────────────────────────────────────
import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '../../utils/cn.js';
import { useUiStore, type ToastVariant } from '../../stores/uiStore.js';

// ── Variant styles ─────────────────────────────────────────────────────────────

const variantClasses: Record<ToastVariant, string> = {
  default: 'bg-card text-foreground border-border',
  success:
    'bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800',
  error:
    'bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800',
  warning:
    'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800',
};

// ── Single toast item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

function ToastItem({
  id,
  title,
  description,
  variant,
  duration = 4000,
}: ToastItemProps): React.JSX.Element {
  const removeToast = useUiStore((s) => s.removeToast);

  return (
    <ToastPrimitive.Root
      open
      duration={duration}
      onOpenChange={(open) => {
        if (!open) removeToast(id);
      }}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        variantClasses[variant],
      )}
    >
      <div className="flex-1 grid gap-1">
        <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="text-sm opacity-80">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

// ── Toaster — render inside your app root ─────────────────────────────────────

/** Drop <Toaster /> once inside AppShell to enable toast notifications globally. */
export function Toaster(): React.JSX.Element {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
      <ToastPrimitive.Viewport
        className={cn(
          'fixed bottom-4 right-4 z-[100]',
          'flex max-h-screen w-full max-w-sm flex-col gap-2',
          'pointer-events-none',
        )}
      />
    </ToastPrimitive.Provider>
  );
}

// ── Named exports for individual parts (if consumers need to build custom toasts) ──

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = ToastPrimitive.Viewport;
export const Toast = ToastPrimitive.Root;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastClose = ToastPrimitive.Close;
export const ToastAction = ToastPrimitive.Action;
