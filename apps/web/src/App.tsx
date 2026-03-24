// ─────────────────────────────────────────────────────────────────────────────
// App.tsx — Root router and route definitions
//
// Route structure follows the architecture diagram in docs/planning/mindpalace-development-plan.md
// Section 7.1. New pages are added here as each sprint delivers them.
// ─────────────────────────────────────────────────────────────────────────────
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute.js';
import { FullPageSpinner } from './components/common/LoadingSpinner.js';
import { AppShell } from './components/layout/AppShell.js';

// Lazy-load each page to keep the initial bundle small
const LoginPage = lazy(() => import('./pages/LoginPage.js'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.js'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.js'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.js'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.js'));
const BookmarkDetailPage = lazy(() => import('./pages/BookmarkDetailPage.js'));
const SearchPage = lazy(() => import('./pages/SearchPage.js'));
const TagManagementPage = lazy(() => import('./pages/TagManagementPage.js'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js'));
const ImportExportPage = lazy(() => import('./pages/ImportExportPage.js'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.js'));

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          {/* Public-only routes — redirect to /dashboard when already logged in */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected routes — redirect to /login when not authenticated */}
          <Route element={<ProtectedRoute />}>
            {/* AppShell provides the sidebar + topbar for all authenticated pages */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bookmarks/:id" element={<BookmarkDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/tags" element={<TagManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
