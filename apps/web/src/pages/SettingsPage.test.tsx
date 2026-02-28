// -----------------------------------------------------------------------------
// pages/SettingsPage.test.tsx � Unit tests for the SettingsPage component
// -----------------------------------------------------------------------------
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// -- Mocks (must be declared before component import) -------------------------

vi.mock('../stores/authStore.js', () => {
  const useAuthStore = vi.fn(
    (sel: (s: { user: { displayName: string; email: string } }) => unknown) =>
      sel({ user: { displayName: 'Alice', email: 'alice@example.com' } }),
  );
  // The component calls useAuthStore.setState(...) after a successful save —
  // stub it so it doesn't throw.
  (useAuthStore as unknown as { setState: ReturnType<typeof vi.fn> }).setState = vi.fn();
  return { useAuthStore };
});

vi.mock('../api/auth.api.js', () => ({
  apiUpdateMe: vi.fn(),
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  apiLogout: vi.fn(),
}));

import SettingsPage from './SettingsPage.js';
import { apiUpdateMe } from '../api/auth.api.js';

// -- Helpers -------------------------------------------------------------------

function renderSettings(): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// -- Rendering -----------------------------------------------------------------

describe('SettingsPage � rendering', () => {
  it('renders the Profile section heading', () => {
    renderSettings();
    expect(screen.getByText('Profile')).toBeDefined();
  });

  it('renders the Password section heading', () => {
    renderSettings();
    expect(screen.getByText('Password')).toBeDefined();
  });

  it('renders the Appearance section heading', () => {
    renderSettings();
    expect(screen.getByText('Appearance')).toBeDefined();
  });

  it('pre-fills display name from auth store', () => {
    renderSettings();
    expect(screen.getByDisplayValue('Alice')).toBeDefined();
  });

  it('pre-fills email from auth store', () => {
    renderSettings();
    expect(screen.getByDisplayValue('alice@example.com')).toBeDefined();
  });
});

// -- Profile form --------------------------------------------------------------

describe('SettingsPage � profile form', () => {
  it('calls apiUpdateMe with new display name on submit', async () => {
    vi.mocked(apiUpdateMe).mockResolvedValue({
      displayName: 'Bob',
      email: 'alice@example.com',
    } as never);
    renderSettings();
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getAllByRole('button', { name: /save changes/i })[0]!);
    await waitFor(() => {
      expect(apiUpdateMe).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Bob' }));
    });
  });

  it('shows success message after successful profile save', async () => {
    vi.mocked(apiUpdateMe).mockResolvedValue({
      displayName: 'Alice',
      email: 'alice@example.com',
    } as never);
    renderSettings();
    fireEvent.click(screen.getAllByRole('button', { name: /save changes/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeDefined();
    });
  });

  it('shows error message on API failure', async () => {
    vi.mocked(apiUpdateMe).mockRejectedValue(new Error('Server error'));
    renderSettings();
    fireEvent.click(screen.getAllByRole('button', { name: /save changes/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeDefined();
    });
  });
});

// -- Password form validation --------------------------------------------------

describe('SettingsPage � password form', () => {
  it('shows mismatch error when passwords do not match', async () => {
    renderSettings();
    const pwInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    );
    if (pwInputs[0] && pwInputs[1] && pwInputs[2]) {
      fireEvent.change(pwInputs[0], { target: { value: 'oldpass123' } });
      fireEvent.change(pwInputs[1], { target: { value: 'newpass123' } });
      fireEvent.change(pwInputs[2], { target: { value: 'different!!' } });
    }
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeDefined();
    });
  });

  it('shows error when new password is shorter than 8 characters', async () => {
    renderSettings();
    const pwInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    );
    if (pwInputs[0] && pwInputs[1] && pwInputs[2]) {
      fireEvent.change(pwInputs[0], { target: { value: 'old' } });
      fireEvent.change(pwInputs[1], { target: { value: 'short' } });
      fireEvent.change(pwInputs[2], { target: { value: 'short' } });
    }
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
    });
  });
});
