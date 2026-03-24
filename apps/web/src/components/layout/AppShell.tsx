// ─────────────────────────────────────────────────────────────────────────────
// components/layout/AppShell.tsx — Authenticated app shell
//
// Renders the full-height sidebar + main content area layout.
// Child routes are rendered via <Outlet />.
//
// Responsive layout:
//   • Mobile (<lg): sidebar is a fixed slide-over drawer with a dark backdrop.
//     Closed by default; opened via the hamburger button in Topbar.
//   • Desktop (lg+): sidebar is an inline static column that toggles between
//     w-60 (open) and w-0 (collapsed) without any overlay.
//
// Accessibility:
//   • "Skip to main content" link is the first focusable element on every page.
//   • <main> has id="main-content" and tabIndex={-1} so the skip link can
//     move focus into it programmatically.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useCollectionsStore } from '../../stores/collectionsStore.js';
import { useTheme } from '../../hooks/useTheme.js';
import { ErrorBoundary } from '../common/ErrorBoundary.js';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { Toaster } from '../ui/toast.js';
import { cn } from '../../utils/cn.js';

export function AppShell(): React.JSX.Element {
  // Apply stored theme preference (from authStore / backend) to <html>
  // This hook adds/removes the 'dark' class on document.documentElement.
  useTheme();

  // On mobile the sidebar starts closed so it doesn't obscure content.
  // On desktop (lg+) it starts open via CSS (lg:translate-x-0 / lg:w-60).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fetchTree = useCollectionsStore((s) => s.fetchTree);

  // Open sidebar by default on desktop after first render
  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  // Load collection tree once when the shell mounts
  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  // Close the mobile sidebar when clicking a nav link
  const closeSidebar = (): void => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Skip to main content (WCAG 2.1 AA — 2.4.1) ──────────────────── */}
      <a
        href="#main-content"
        className={cn(
          'absolute left-4 top-4 z-[9999] -translate-y-20 rounded-md bg-primary px-4 py-2',
          'text-sm font-semibold text-primary-foreground shadow-lg transition-transform',
          'focus:translate-y-0',
        )}
      >
        Skip to main content
      </a>

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      {/*
        Mobile  (<lg): fixed overlay, slides from left.
          open  → translate-x-0  (visible)
          closed → -translate-x-full (off-screen)
        Desktop (lg+): static inline column, no transform.
          open  → w-60
          closed → w-0 overflow-hidden
      */}
      <aside
        className={cn(
          // Shared
          'flex flex-col border-r border-border bg-card transition-all duration-200',
          // Mobile: fixed overlay
          'fixed inset-y-0 left-0 z-50 w-64',
          sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full shadow-none',
          // Desktop: static inline, no transform, no shadow
          'lg:static lg:z-auto lg:shadow-none lg:translate-x-0 lg:flex-shrink-0 lg:h-full',
          // Desktop width toggle (overrides the fixed w-64 above when static)
          sidebarOpen ? 'lg:w-60' : 'lg:w-0 lg:overflow-hidden',
        )}
      >
        <Sidebar onClose={closeSidebar} />
      </aside>

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        {/* tabIndex={-1} allows the skip link to programmatically focus this element */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6 outline-none">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global toast notifications */}
      <Toaster />
    </div>
  );
}
