/**
 * Authentication Persistence Module
 * Handles persistent login sessions across browser restarts
 */
import { API_ENDPOINTS } from "./api";
import { authFetch } from "./authFetch";

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
 * Persist the non-sensitive parts of the session for this device.
 *
 * The JWTs are deliberately NOT stored here. They live only in httpOnly cookies
 * issued by the API, which page JavaScript cannot read — so an XSS can no longer
 * exfiltrate a session, which was the whole point of the cookie migration.
 *
 * What stays is only what the UI needs and what is safe to expose:
 *   - USER_INFO_KEY  — display name / avatar / role flags, drives the navbar and
 *                      `isAuthenticated()`. A forged value gets a prettier menu
 *                      and 401s on every request; authorisation is server-side.
 *   - TOKEN_EXPIRY_KEY — when to proactively refresh. Refreshing itself needs no
 *                      token here: /auth/refresh reads the httpOnly cookie.
 */
export function storeAuthData(
  user: StoredUser,
  expiresIn: number = 3600, // Default 1 hour
): void {
  try {
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

// getAccessToken()/getRefreshToken() are intentionally gone. The tokens are
// httpOnly-cookie-only now, so a getter could never return anything but null —
// keeping them around would only invite a caller to "authenticate" with null and
// get silent 401s. Requests authenticate by going through authFetch().

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
  try {
    // No body: the httpOnly refresh cookie is the credential. The server reads
    // it via REFRESH_TOKEN_COOKIE and rotates both cookies in the response.
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Token refresh failed:", response.status);
      clearAuthData();
      return false;
    }

    const data = await response.json();

    if (data.success && data.tokens) {
      // The rotated tokens themselves are only persisted as cookies by the
      // server; all we track locally is when to refresh next.
      const expiryTime = Date.now() + data.tokens.expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

      // Schedule next refresh
      scheduleTokenRefresh(data.tokens.expiresIn * 1000);

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
  // Gated on the stored user info rather than the tokens: the session lives in
  // an httpOnly cookie that page JS cannot see, so a token check here would
  // report "logged out" for a perfectly good session — and would break outright
  // once step 2 stops writing the tokens at all.
  const user = getStoredUser();

  if (!user) {
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

  // Verify the session with the backend — the cookie authenticates this.
  try {
    const response = await authFetch(API_ENDPOINTS.AUTH_ME);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        // Update stored user info
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
        return data.user;
      }
    }

    // An explicit rejection means the session is genuinely gone. Previously the
    // stale `user_info` was returned here, which rendered a signed-in UI that
    // 401ed on every action; the token gate above used to mask this.
    if (response.status === 401 || response.status === 403) {
      clearAuthData();
      return null;
    }
  } catch (error) {
    // Network/CORS failure — the session may well be fine, so fall through to
    // the cached user rather than signing them out on a blip.
    console.error("Session verification failed:", error);
  }

  return user;
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  try {
    // Nothing writes these two any more, but keep removing them: users who
    // logged in before the cookie migration still have stale JWTs sitting in
    // localStorage, and logout is the natural moment to clean them up.
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
 */
export function isAuthenticated(): boolean {
  return !!getStoredUser();
}
