// ─────────────────────────────────────────────────────────────────────────────
// components/auth/PublicOnlyRoute.tsx
//
// Wraps public-only pages (login, register). If the user IS already logged in,
// redirects them away to /dashboard so they can't see the login page again.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../stores/authStore.js';

export function PublicOnlyRoute(): React.ReactElement {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
