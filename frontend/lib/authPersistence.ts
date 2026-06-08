/**
 * Authentication Persistence Module
 * Tokens are stored in httpOnly cookies set by the backend — never in JS-accessible storage.
 * This module only caches the non-sensitive user profile in localStorage for fast UI rendering.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const USER_INFO_KEY = "user_info";

export interface StoredUser {
  id: string;
  displayName: string;
  avatar?: string;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  kickUsername?: string;
}

/**
 * Persist the user profile (non-sensitive) so the UI can render before the /me call resolves.
 */
export function storeAuthData(user: StoredUser): void {
  try {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable (SSR / private browsing)
  }
}

/**
 * Get the cached user profile.
 */
export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/**
 * Remove the cached user profile and ask the backend to clear auth cookies.
 */
export async function clearAuthData(): Promise<void> {
  try {
    localStorage.removeItem(USER_INFO_KEY);
  } catch {
    // ignore
  }
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore — cookies cleared server-side if reachable
  }
}

/**
 * Silently refresh the access-token cookie via the backend.
 * The new cookie is set automatically by the Set-Cookie response header.
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      // No body needed — backend reads refresh_token from the cookie
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Initialize authentication on app load.
 * 1. Return the cached user profile immediately (fast path).
 * 2. Validate with the backend in the background; if the cookie is valid the
 *    response contains fresh user data, which we cache and return.
 * 3. If the cookie is expired, attempt a refresh; on failure clear the cache.
 */
export async function initializeAuth(): Promise<StoredUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const user: StoredUser = {
          id: data.user.id,
          displayName: data.user.displayName,
          avatar: data.user.avatar,
          points: data.user.points,
          isAdmin: data.user.isAdmin,
          isModerator: data.user.isModerator,
          kickUsername: data.user.kickUsername,
        };
        storeAuthData(user);
        return user;
      }
    }

    if (res.status === 401) {
      // Access token expired — try refresh
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        await clearAuthData();
        return null;
      }
      // Retry /me with the new cookie
      const retry = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      if (retry.ok) {
        const data = await retry.json();
        if (data.success && data.user) {
          const user: StoredUser = {
            id: data.user.id,
            displayName: data.user.displayName,
            avatar: data.user.avatar,
            points: data.user.points,
            isAdmin: data.user.isAdmin,
            isModerator: data.user.isModerator,
            kickUsername: data.user.kickUsername,
          };
          storeAuthData(user);
          return user;
        }
      }
      await clearAuthData();
      return null;
    }

    return null;
  } catch {
    // Network error — return cached profile so UI doesn't flash logged-out
    return getStoredUser();
  }
}

/**
 * Update the cached user profile (e.g. after a points change).
 */
export function updateStoredUser(updates: Partial<StoredUser>): void {
  try {
    const current = getStoredUser();
    if (current) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify({ ...current, ...updates }));
    }
  } catch {
    // ignore
  }
}

/**
 * Returns true if there is a cached user profile (optimistic check — the
 * actual auth state is determined by the httpOnly cookie on the next request).
 */
export function isAuthenticated(): boolean {
  return getStoredUser() !== null;
}
