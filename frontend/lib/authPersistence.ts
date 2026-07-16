/**
 * Authentication Persistence Module
 * Handles persistent login sessions across browser restarts
 */
import { API_ENDPOINTS } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://website-production-ece1.up.railway.app";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_INFO_KEY = "user_info";
const TOKEN_EXPIRY_KEY = "token_expiry";

// Token refresh interval (refresh 5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

let refreshTimer: NodeJS.Timeout | null = null;

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
 * Store authentication tokens and user info
 */
/**
 * Persist the session for this device.
 *
 * MIGRATION — the two `setItem` calls below are the last thing keeping JWTs
 * readable by page JavaScript (and therefore stealable by an XSS). The API
 * already sets httpOnly cookies on the OAuth callback, and every request path
 * here sends `credentials: "include"`, so the tokens are redundant the moment
 * the last direct `localStorage.getItem("access_token")` caller is migrated to
 * `authFetch()`. Deleting these two lines is the final step — see lib/authFetch.ts.
 */
export function storeAuthData(
  accessToken: string,
  refreshToken: string,
  user: StoredUser,
  expiresIn: number = 3600, // Default 1 hour
): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));

    // Calculate expiry time
    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    // Start automatic token refresh
    scheduleTokenRefresh(expiresIn * 1000);
  } catch (error) {
    console.error("Failed to store auth data:", error);
  }
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get access token:", error);
    return null;
  }
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get refresh token:", error);
    return null;
  }
}

/**
 * Get stored user info
 */
export function getStoredUser(): StoredUser | null {
  try {
    const userJson = localStorage.getItem(USER_INFO_KEY);
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch (error) {
    console.error("Failed to get stored user:", error);
    return null;
  }
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(): boolean {
  try {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();

    // Consider expired if within 5 minutes of expiry
    return now >= expiryTime - REFRESH_BUFFER_MS;
  } catch (error) {
    console.error("Failed to check token expiry:", error);
    return true;
  }
}

/**
 * Refresh the access token.
 *
 * Sends `credentials: "include"` so the httpOnly refresh cookie is used when
 * present; the body token is a fallback for sessions created before cookies
 * existed. The server rotates both the cookies and the response body, so this
 * works either way and needs no branching here.
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      // Omit the body entirely when there's no stored token — the cookie is
      // then the only credential, which is the end state we're migrating to.
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
    });

    if (!response.ok) {
      console.error("Token refresh failed:", response.status);
      clearAuthData();
      return false;
    }

    const data = await response.json();

    if (data.success && data.tokens) {
      // Update tokens
      localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);

      // Update expiry
      const expiryTime = Date.now() + data.tokens.expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

      // Schedule next refresh
      scheduleTokenRefresh(data.tokens.expiresIn * 1000);

      console.log("Token refreshed successfully");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Token refresh error:", error);
    return false;
  }
}

/**
 * Schedule automatic token refresh
 */
function scheduleTokenRefresh(expiresInMs: number): void {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  // Schedule refresh 5 minutes before expiry
  const refreshTime = Math.max(expiresInMs - REFRESH_BUFFER_MS, 60000); // At least 1 minute

  refreshTimer = setTimeout(async () => {
    const success = await refreshAccessToken();

    if (!success) {
      clearAuthData();
      if (typeof window !== "undefined") {
        window.location.href = "/?session=expired";
      }
    }
  }, refreshTime);
}

/**
 * Initialize authentication on app load
 * Checks if tokens exist and refreshes if needed
 */
export async function initializeAuth(): Promise<StoredUser | null> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const user = getStoredUser();

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  // Check if token is expired or about to expire
  if (isTokenExpired()) {
    console.log("Token expired, attempting refresh...");
    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      console.warn("Token refresh failed, clearing auth data");
      clearAuthData();
      return null;
    }
  } else {
    // Token is still valid, schedule refresh
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiryStr) {
      const expiryTime = parseInt(expiryStr, 10);
      const timeUntilExpiry = expiryTime - Date.now();
      scheduleTokenRefresh(timeUntilExpiry);
    }
  }

  // Verify the session with the backend. credentials:"include" means this keeps
  // working once the access token is no longer in localStorage — the cookie
  // authenticates it.
  try {
    const response = await fetch(API_ENDPOINTS.AUTH_ME, {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        // Update stored user info
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
        return data.user;
      }
    }
  } catch (error) {
    console.error("Token verification failed:", error);
  }

  return user;
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);

    // Clear refresh timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  } catch (error) {
    console.error("Failed to clear auth data:", error);
  }
}

/**
 * Update stored user info (e.g., after points change)
 */
export function updateStoredUser(updates: Partial<StoredUser>): void {
  try {
    const currentUser = getStoredUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(updatedUser));
    }
  } catch (error) {
    console.error("Failed to update stored user:", error);
  }
}

/**
 * Is there a session on this device?
 *
 * Deliberately keyed off the stored *user info*, not the token: once tokens move
 * to httpOnly cookies, page JS can't see them, so "do I hold a token" stops
 * being answerable client-side. `user_info` is non-sensitive (display name,
 * avatar, role flags) and is what the UI actually needs anyway.
 *
 * This is a UI hint for routing/rendering — never a security boundary. Every
 * protected read is still authorised server-side against the cookie; a user who
 * forges `user_info` gets a prettier menu and 401s on every request.
 *
 * The token check is retained as a fallback so sessions created before the
 * cookie migration keep working until they expire.
 */
export function isAuthenticated(): boolean {
  if (getStoredUser()) return true;
  return !!(getAccessToken() && getRefreshToken());
}
