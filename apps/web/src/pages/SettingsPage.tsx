// ─────────────────────────────────────────────────────────────────────────────
// pages/SettingsPage.tsx — Profile edit, password change, theme, account actions
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import { apiUpdateMe } from '../api/auth.api.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Profile section ────────────────────────────────────────────────────────

function ProfileSection(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await apiUpdateMe({ displayName, email });
      // Optimistically update store user reference
      useAuthStore.setState((s) => ({ ...s, user: s.user ? { ...s.user, ...updated } : null }));
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Profile" description="Update your display name and email address.">
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
            Display name
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">Profile saved.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Section>
  );
}

// ── Password section ───────────────────────────────────────────────────────

function PasswordSection(): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiUpdateMe({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Password"
      description="Change your account password. You'll need to enter your current password."
    >
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Current password
          </label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-foreground">
            New password
          </label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Confirm new password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            required
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">Password updated.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Section>
  );
}

// ── Theme section ──────────────────────────────────────────────────────────

const THEMES: Array<{ id: 'light' | 'dark' | 'system'; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

function ThemeSection(): React.JSX.Element {
  // Read current class on <html> to determine active theme
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const [active, setActive] = React.useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('mindpalace-theme') as 'light' | 'dark' | 'system' | null;
    return stored ?? 'system';
  });

  function applyTheme(choice: 'light' | 'dark' | 'system'): void {
    setActive(choice);
    localStorage.setItem('mindpalace-theme', choice);
    const isDark =
      choice === 'dark' ||
      (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    // Persist preference to backend (fire-and-forget — UI is already applied)
    void apiUpdateMe({ theme: choice.toUpperCase() as 'LIGHT' | 'DARK' | 'SYSTEM' }).catch(
      () => {
        /* non-critical — localStorage already applied */
      },
    );
  }

  void current; // used for SSR guard in future

  return (
    <Section title="Appearance" description="Choose how Mind Palace looks for you.">
      <div className="flex gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTheme(t.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors
              ${
                active === t.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary/60'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ── Danger zone ────────────────────────────────────────────────────────────

function DangerZone(): React.JSX.Element {
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout(): Promise<void> {
    await logout();
  }

  return (
    <Section title="Account" description="Log out of your current session.">
      <Button type="button" variant="destructive" onClick={() => void handleLogout()}>
        Log out
      </Button>
    </Section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>
      <div className="space-y-6">
        <ProfileSection />
        <PasswordSection />
        <ThemeSection />
        <DangerZone />
      </div>
    </div>
  );
}
