import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthResult } from '@app-types/index';
import { tokenStorage } from '@services/auth/tokenStorage';
import { authApi } from '@services/api';

const USER_CACHE_KEY = 'dollop_user_cache';

// ── Snake_case → camelCase transform ─────────────────────────────────────────
// The backend returns Supabase DB row field names (snake_case).
// Our frontend User type uses camelCase. This function bridges the gap.
type ApiUserRow = {
  id: string;
  email: string;
  display_name?: string | null;
  displayName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  provider: 'google' | 'magic_link';
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

function mapApiUserToUser(raw: ApiUserRow): User {
  return {
    id: raw.id,
    email: raw.email,
    // Accept either snake_case (from backend) or camelCase (from cache)
    displayName: raw.displayName ?? raw.display_name ?? null,
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? null,
    provider: raw.provider,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
  };
}

// ── User cache ────────────────────────────────────────────────────────────────
async function saveUserCache(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify(user));
  } catch { /* non-fatal */ }
}

async function loadUserCache(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

async function clearUserCache(): Promise<void> {
  try { await SecureStore.deleteItemAsync(USER_CACHE_KEY); } catch { /* non-fatal */ }
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  hydrateFromStorage: () => Promise<void>;
  signInWithResult: (result: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOffline: false,

  hydrateFromStorage: async () => {
    set({ isLoading: true });
    try {
      const hasTokens = await tokenStorage.hasTokens();
      if (!hasTokens) {
        await clearUserCache();
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      try {
        const { user: rawUser } = await authApi.getMe();
        const user = mapApiUserToUser(rawUser as unknown as ApiUserRow);
        await saveUserCache(user);
        set({ user, isAuthenticated: true, isOffline: false });
      } catch (networkErr) {
        const isNetworkFailure = networkErr instanceof Error && (
          networkErr.message.toLowerCase().includes('network') ||
          networkErr.message.toLowerCase().includes('failed to fetch') ||
          networkErr.message.toLowerCase().includes('timeout') ||
          networkErr.message.includes('Network request failed')
        );

        if (isNetworkFailure) {
          const cachedUser = await loadUserCache();
          if (cachedUser) {
            set({ user: cachedUser, isAuthenticated: true, isOffline: true });
            return;
          }
          try {
            const refreshToken = await tokenStorage.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');
            const { tokens } = await authApi.refreshToken(refreshToken);
            await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken);
            const { user: rawUser } = await authApi.getMe();
            const user = mapApiUserToUser(rawUser as unknown as ApiUserRow);
            await saveUserCache(user);
            set({ user, isAuthenticated: true, isOffline: false });
          } catch {
            set({ user: null, isAuthenticated: true, isOffline: true });
          }
        } else {
          await tokenStorage.clearTokens();
          await clearUserCache();
          set({ user: null, isAuthenticated: false, isOffline: false });
        }
      }
    } catch {
      set({ user: null, isAuthenticated: false, isOffline: false });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithResult: async (result: AuthResult) => {
    await tokenStorage.saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
    const user = mapApiUserToUser(result.user as unknown as ApiUserRow);
    await saveUserCache(user);
    set({ user, isAuthenticated: true, isOffline: false });
  },

  signOut: async () => {
    await tokenStorage.clearTokens();
    await clearUserCache();
    set({ user: null, isAuthenticated: false, isOffline: false });
  },

  setUser: (user: User) => {
    if (get().isAuthenticated) {
      void saveUserCache(user);
      set({ user });
    }
  },
}));