// ─────────────────────────────────────────────────────────────────────────────
// components/layout/Topbar.tsx — Application top bar
//
// Contains: hamburger menu toggle, app name, user avatar / display name,
//           sign-out button.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { Button } from '../ui/button.js';

interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ sidebarOpen, onToggleSidebar }: TopbarProps): React.JSX.Element {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {/* Simple three-line hamburger icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold tracking-tight">Mind Palace</span>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.displayName ?? user?.email}</span>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
