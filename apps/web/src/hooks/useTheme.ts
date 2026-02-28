// ─────────────────────────────────────────────────────────────────────────────
// hooks/useTheme.ts — Read and toggle the application colour theme
//
// Reads from the authenticated user's profile (authStore) and applies the
// correct dark/light class to <html>. Also exposes a toggle action.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore.js';

export type ResolvedTheme = 'light' | 'dark';

export interface UseThemeResult {
  theme: ResolvedTheme;
  toggleTheme: () => void;
}

/**
 * Applies the theme class to `document.documentElement` and exposes a toggle.
 * The system preference is used when the user's stored theme is 'SYSTEM'.
 */
export function useTheme(): UseThemeResult {
  const user = useAuthStore((s) => s.user);

  const getResolved = (): ResolvedTheme => {
    const stored = user?.theme ?? 'SYSTEM';
    if (stored === 'DARK') return 'dark';
    if (stored === 'LIGHT') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const resolved = getResolved();

  useEffect(() => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolved]);

  const toggleTheme = (): void => {
    // Optimistically toggle the class for instant feedback; the API update is
    // handled by the SettingsPage profile update flow.
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  };

  return { theme: resolved, toggleTheme };
}
