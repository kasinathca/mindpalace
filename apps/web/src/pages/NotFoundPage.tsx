// ─────────────────────────────────────────────────────────────────────────────
// pages/NotFoundPage.tsx — 404 page
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button.js';

export default function NotFoundPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">Go home</Link>
      </Button>
    </div>
  );
}
