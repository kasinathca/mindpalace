// ─────────────────────────────────────────────────────────────────────────────
// components/auth/ProtectedRoute.tsx
//
// Wraps authenticated pages. If the user is not logged in, redirects to /login
// and saves the attempted URL in `state.from` so we can redirect back after login.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../stores/authStore.js';

export function ProtectedRoute(): React.ReactElement {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
