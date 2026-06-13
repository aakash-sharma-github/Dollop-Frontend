import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { User, AuthResult } from "@app-types/index";
import { tokenStorage } from "@services/auth/tokenStorage";
import { authApi } from "@services/api";
import { logger } from "@utils/logger";

const USER_CACHE_KEY = "dollop_user_cache";

// ── Snake_case → camelCase transform ─────────────────────────────────────────
type ApiUserRow = {
  id: string;
  email: string;
  display_name?: string | null;
  displayName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  provider: "google" | "magic_link";
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

function mapApiUserToUser(raw: ApiUserRow): User {
  return {
    id: raw.id,
    email: raw.email,
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
  } catch {
    /* non-fatal */
  }
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
  try {
    await SecureStore.deleteItemAsync(USER_CACHE_KEY);
  } catch {
    /* non-fatal */
  }
}

// ── Session refresh helper ────────────────────────────────────────────────────
/**
 * Attempts to refresh the access token using the stored refresh token.
 * Returns the refreshed user or null if refresh fails.
 *
 * This is called BEFORE treating any auth failure as a logout event.
 * JWT access tokens expire in 15 minutes — refresh tokens last 7 days.
 * Without this, users get logged out after every 15 minute idle period.
 */
async function tryRefreshSession(): Promise<User | null> {
  try {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) return null;
    const { tokens } = await authApi.refreshToken(refreshToken);
    await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken);
    const { user: rawUser } = await authApi.getMe();
    const user = mapApiUserToUser(rawUser as unknown as ApiUserRow);
    await saveUserCache(user);
    return user;
  } catch {
    return null;
  }
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

  /**
   * Called on app launch. Strategy:
   *
   * 1. No tokens → not logged in
   * 2. Has tokens → restore from cache immediately (instant UI, no flicker)
   * 3. Background: try getMe() to refresh user data
   *    a. Success → update cache, mark online
   *    b. 401/403 → try token refresh. If refresh succeeds → update. If fails → logout
   *    c. Network error → stay logged in with cache, mark offline
   *
   * This means the user is NEVER logged out just because the network is down
   * or because the 15-minute access token has expired (refresh handles that).
   */
  hydrateFromStorage: async () => {
    set({ isLoading: true });
    logger.debug("Auth", "hydrateFromStorage: start");
    try {
      const hasTokens = await tokenStorage.hasTokens();
      logger.debug("Auth", "hydrateFromStorage: hasTokens", { hasTokens });
      if (!hasTokens) {
        await clearUserCache();
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      // Step 1: Restore from cache immediately so UI shows instantly
      const cachedUser = await loadUserCache();
      if (cachedUser) {
        logger.debug("Auth", "hydrateFromStorage: restored from cache", {
          email: cachedUser.email,
        });
        set({ user: cachedUser, isAuthenticated: true, isOffline: false });
        set({ isLoading: false }); // Hide splash immediately
      }

      // Step 2: Validate token in the background (don't block UI)
      try {
        const { user: rawUser } = await authApi.getMe();
        const freshUser = mapApiUserToUser(rawUser as unknown as ApiUserRow);
        await saveUserCache(freshUser);
        logger.info("Auth", "hydrateFromStorage: getMe success", {
          email: freshUser.email,
        });
        set({ user: freshUser, isAuthenticated: true, isOffline: false });
      } catch (err) {
        const isAuthFailure =
          err instanceof Error &&
          (err.message.includes("401") ||
            err.message.includes("403") ||
            err.message.includes("INVALID_TOKEN") ||
            err.message.includes("TOKEN_EXPIRED") ||
            err.message.includes("USER_NOT_FOUND"));
        const isNetworkError =
          err instanceof Error &&
          (err.message.includes("Network request failed") ||
            err.message.includes("Failed to fetch") ||
            err.message.includes("timeout") ||
            err.message.includes("network"));

        logger.warn("Auth", "hydrateFromStorage: getMe failed", {
          message: err instanceof Error ? err.message : String(err),
          isAuthFailure,
          isNetworkError,
        });

        if (isAuthFailure) {
          // Token is expired or invalid — try to refresh before logging out
          const refreshedUser = await tryRefreshSession();
          if (refreshedUser) {
            logger.info("Auth", "hydrateFromStorage: token refresh succeeded", {
              email: refreshedUser.email,
            });
            set({
              user: refreshedUser,
              isAuthenticated: true,
              isOffline: false,
            });
          } else if (!cachedUser) {
            // Refresh also failed and no cache → must log out
            logger.warn(
              "Auth",
              "hydrateFromStorage: refresh failed, no cache — logging out",
            );
            await tokenStorage.clearTokens();
            await clearUserCache();
            set({ user: null, isAuthenticated: false });
          } else {
            logger.info(
              "Auth",
              "hydrateFromStorage: refresh failed, staying logged in with cache",
            );
          }
          // If we have cached user but refresh failed → stay logged in with cache
          // This covers the case where the backend itself is down
        } else if (isNetworkError) {
          // No connectivity — stay logged in with cached data
          logger.info(
            "Auth",
            "hydrateFromStorage: network error, staying logged in offline",
          );
          set({ isOffline: true });
        }
        // Any other error → keep user logged in with cache, don't logout
      }
    } catch (err) {
      // SecureStore read failure — can't do anything useful, show login
      logger.error("Auth", "hydrateFromStorage: SecureStore read failed", err);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithResult: async (result: AuthResult) => {
    await tokenStorage.saveTokens(
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
    const user = mapApiUserToUser(result.user as unknown as ApiUserRow);
    await saveUserCache(user);
    logger.info("Auth", "signInWithResult", {
      email: user.email,
      provider: user.provider,
    });
    set({ user, isAuthenticated: true, isOffline: false });
  },

  signOut: async () => {
    logger.info("Auth", "signOut");
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
