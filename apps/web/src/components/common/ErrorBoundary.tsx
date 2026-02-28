// ─────────────────────────────────────────────────────────────────────────────
// components/common/ErrorBoundary.tsx — React error boundary wrapper
//
// Catches uncaught render errors in any child component tree and renders a
// friendly fallback instead of crashing the entire page.
//
// NOTE: Error boundaries must be class components — this cannot be rewritten as
// a function component because `getDerivedStateFromError` and
// `componentDidCatch` lifecycle methods are only available on classes.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Button } from '../ui/button.js';

interface ErrorBoundaryProps {
  /** What to render when an error is caught. If omitted a default fallback is shown. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // In production, send to an error-tracking service (e.g. Sentry).
    // For now log to dev console via the browser's built-in mechanism.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught render error', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>

        <div className="space-y-1">
          <p className="font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={this.handleReset}>
          Try again
        </Button>
      </div>
    );
  }
}
