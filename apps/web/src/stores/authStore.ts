// ─────────────────────────────────────────────────────────────────────────────
// stores/authStore.ts — Zustand authentication store
//
// Manages: current user, access/refresh tokens, loading state, error state
// Tokens are intentionally kept in memory only to reduce XSS exposure.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import type { User, LoginInput, RegisterInput } from '@mindpalace/shared';
import { apiLogin, apiRegister, apiLogout } from '../api/auth.api.js';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string) => void;
  clearError: () => void;
  /** Called by the API client when a refresh request fails */
  _forceLogout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiLogin(input);
      set({
        user: result.user,
        accessToken: result.accessToken,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRegister(input);
      set({
        user: result.user,
        accessToken: result.accessToken,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      // Silently ignore logout API errors — we clear local state regardless
    } finally {
      set({ user: null, accessToken: null, error: null });
    }
  },

  setTokens: (accessToken) => {
    set({ accessToken });
  },

  clearError: () => set({ error: null }),

  _forceLogout: () => {
    set({ user: null, accessToken: null, error: null });
  },
}));

/** Convenience selector: is there an authenticated user? */
export const selectIsAuthenticated = (state: AuthStore): boolean => state.user !== null;
