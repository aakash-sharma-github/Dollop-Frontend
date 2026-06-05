import { create } from 'zustand';
import type { User, AuthResult } from '@app-types/index';
import { tokenStorage } from '@services/auth/tokenStorage';
import { authApi } from '@services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrateFromStorage: () => Promise<void>;
  signInWithResult: (result: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrateFromStorage: async () => {
    set({ isLoading: true });
    try {
      const hasTokens = await tokenStorage.hasTokens();
      if (!hasTokens) { set({ isLoading: false }); return; }

      try {
        const { user } = await authApi.getMe();
        set({ user: user as User, isAuthenticated: true });
      } catch {
        // Access token expired — try refresh
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) { await tokenStorage.clearTokens(); set({ isLoading: false }); return; }

        const { tokens } = await authApi.refreshToken(refreshToken);
        await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken);
        const { user } = await authApi.getMe();
        set({ user: user as User, isAuthenticated: true });
      }
    } catch {
      await tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithResult: async (result: AuthResult) => {
    await tokenStorage.saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
    set({ user: result.user as User, isAuthenticated: true });
  },

  signOut: async () => {
    await tokenStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    if (get().isAuthenticated) set({ user });
  },
}));
