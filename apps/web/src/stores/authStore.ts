// ─────────────────────────────────────────────────────────────────────────────
// stores/authStore.ts — Zustand authentication store
//
// Manages: current user, access/refresh tokens, loading state, error state
// Tokens are persisted to sessionStorage so they survive page refreshes
// within the same tab but not cross-tab (safer than localStorage for auth).
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, LoginInput, RegisterInput } from '@mindpalace/shared';
import { apiLogin, apiRegister, apiLogout } from '../api/auth.api.js';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearError: () => void;
  /** Called by the API client when a refresh request fails */
  _forceLogout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const result = await apiLogin(input);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
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
            refreshToken: result.refreshToken,
            isLoading: false,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
          set({ user: null, accessToken: null, refreshToken: null, error: null });
        }
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      clearError: () => set({ error: null }),

      _forceLogout: () => {
        set({ user: null, accessToken: null, refreshToken: null, error: null });
      },
    }),
    {
      name: 'mindpalace-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

/** Convenience selector: is there an authenticated user? */
export const selectIsAuthenticated = (state: AuthStore): boolean => state.user !== null;
