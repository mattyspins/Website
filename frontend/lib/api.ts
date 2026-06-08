// API Configuration
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Default headers — no Authorization header; auth is via httpOnly cookie sent automatically.
// Pages that still pass a Bearer token manually (admin pages) are accepted as fallback by the backend.
const DEFAULT_HEADERS = { "Content-Type": "application/json" };

// Helper kept for backward compat with pages that manually build fetch calls.
// Returns only Content-Type; relying on cookies for auth.
export const getAuthHeaders = (): Record<string, string> => DEFAULT_HEADERS;

function handleError(errorData: any, status: number): never {
  throw new Error(
    (typeof errorData.error === "object"
      ? errorData.error?.message
      : errorData.error) ||
      errorData.message ||
      `HTTP ${status}`,
  );
}

// API Client — all requests include credentials so httpOnly cookies are sent automatically
export const api = {
  get: async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      ...options,
    });
    if (!response.ok) handleError(await response.json().catch(() => ({ error: "Unknown error" })), response.status);
    return response.json();
  },

  post: async (endpoint: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(data),
      ...options,
    });
    if (!response.ok) handleError(await response.json().catch(() => ({ error: "Unknown error" })), response.status);
    return response.json();
  },

  put: async (endpoint: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(data),
      ...options,
    });
    if (!response.ok) handleError(await response.json().catch(() => ({ error: "Unknown error" })), response.status);
    return response.json();
  },

  patch: async (endpoint: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    if (!response.ok) handleError(await response.json().catch(() => ({ error: "Unknown error" })), response.status);
    return response.json();
  },

  delete: async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      ...options,
    });
    if (!response.ok) handleError(await response.json().catch(() => ({ error: "Unknown error" })), response.status);
    return response.json();
  },
};

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_ME: `${API_URL}/api/auth/me`,
  AUTH_REFRESH: `${API_URL}/api/auth/refresh`,
  AUTH_DISCORD_INITIATE: `${API_URL}/api/auth/discord/initiate`,
  AUTH_LOGOUT: `${API_URL}/api/auth/logout`,
  AUTH_KICK_VERIFY: `${API_URL}/api/auth/kick/verify`,
  KICK_VERIFY_INITIATE: `${API_URL}/api/auth/kick-verify/initiate`,
  KICK_VERIFY_STATUS: `${API_URL}/api/auth/kick-verify/status`,
  KICK_OAUTH_INITIATE: `${API_URL}/api/auth/kick/initiate`,
  KICK_OAUTH_STATUS: `${API_URL}/api/auth/kick/status`,
  KICK_OAUTH_UNLINK: `${API_URL}/api/auth/kick/unlink`,

  // Admin
  ADMIN_USERS_SEARCH: `${API_URL}/api/admin/users/search`,
  ADMIN_USER_POINTS: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/points`,
  ADMIN_USER: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}`,
  ADMIN_USER_MODERATOR: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/moderator`,
  ADMIN_USER_VIP: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/vip`,
  ADMIN_USER_DEPOSITOR: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/depositor`,
  ADMIN_USER_SUSPEND: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/suspend`,
  ADMIN_USER_UNSUSPEND: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/unsuspend`,
  ADMIN_VERIFY_KICK: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/verify-kick`,
  ADMIN_EDIT_KICK_USERNAME: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/kick-username`,
  ADMIN_STATS: `${API_URL}/api/admin/dashboard/stats`,
  ADMIN_KICK_CHAT_STATUS: `${API_URL}/api/admin/kick-chat/status`,
  ADMIN_AUDIT_LOGS: `${API_URL}/api/admin/audit-logs`,
  ADMIN_ACTIVITY: `${API_URL}/api/admin/activity`,

  // Raffles
  RAFFLES_ACTIVE: `${API_URL}/api/raffles/active`,
  RAFFLES_CREATE: `${API_URL}/api/raffles/create`,
  RAFFLES_SELECT_WINNERS: (raffleId: string) =>
    `${API_URL}/api/raffles/${raffleId}/select-winners`,
  RAFFLES_TICKETS: (raffleId: string) =>
    `${API_URL}/api/raffles/${raffleId}/tickets`,
  RAFFLES_PURCHASE: (raffleId: string) =>
    `${API_URL}/api/raffles/${raffleId}/purchase`,

  // Users
  USERS_KICK: `${API_URL}/api/auth/kick-username`,

  // Leaderboards (Manual)
  LEADERBOARDS_ACTIVE: `${API_URL}/api/manual-leaderboards?status=active`,
  LEADERBOARDS_CREATE: `${API_URL}/api/manual-leaderboards`,
  LEADERBOARDS_GET: (id: string) => `${API_URL}/api/manual-leaderboards/${id}`,
  LEADERBOARDS_UPDATE: (id: string) =>
    `${API_URL}/api/manual-leaderboards/${id}`,
  LEADERBOARDS_DELETE: (id: string) =>
    `${API_URL}/api/manual-leaderboards/admin/${id}`,
  LEADERBOARDS_ADD_WAGER: (id: string) =>
    `${API_URL}/api/manual-leaderboards/admin/${id}/wagers`,
  LEADERBOARDS_EXPORT_CSV: (id: string) =>
    `${API_URL}/api/manual-leaderboards/admin/${id}/export`,

  // Milestones
  MILESTONES: `${API_URL}/api/milestones`,
  MILESTONES_CLAIM: `${API_URL}/api/milestones/claim`,
  MILESTONES_CLAIMS_ADMIN: `${API_URL}/api/milestones/claims`,
  MILESTONES_CLAIM_UPDATE: (claimId: string) => `${API_URL}/api/milestones/claims/${claimId}`,
  ADMIN_USER_WAGER: (userId: string) =>
    `${API_URL}/api/milestones/users/${userId}/wager`,
  ADMIN_USER_DEPOSIT: (userId: string) =>
    `${API_URL}/api/milestones/users/${userId}/deposit`,

  // Schedule (legacy weekly)
  SCHEDULE_CURRENT: `${API_URL}/api/schedule/current`,
  SCHEDULE_TODAY: `${API_URL}/api/schedule/today`,
  SCHEDULE_LIVE: `${API_URL}/api/schedule/live`,
  SCHEDULE_UPDATE: `${API_URL}/api/schedule/update`,

  // Stream Events
  VIEWING_STREAM_STATUS: `${API_URL}/api/viewing/stream/status`,
  VIEWING_SESSION_START: `${API_URL}/api/viewing/session/start`,
  VIEWING_SESSION_END: `${API_URL}/api/viewing/session/end`,
  VIEWING_SESSION_HEARTBEAT: `${API_URL}/api/viewing/session/heartbeat`,
  STREAM_EVENTS: `${API_URL}/api/stream-events`,
  STREAM_EVENTS_ALL: `${API_URL}/api/stream-events/all`,
  STREAM_EVENT: (id: string) => `${API_URL}/api/stream-events/${id}`,

  // Live Bonus Hunt (viewer page)
  LIVE_HUNT: `${API_URL}/api/live-hunt`,

  // Hunt Tracker (admin persistent storage)
  HUNT_TRACKER: `${API_URL}/api/hunt-tracker`,

  // Daily Check-in
  CHECKIN_STATUS: `${API_URL}/api/checkin/status`,
  CHECKIN_CLAIM: `${API_URL}/api/checkin/claim`,

  // Raffles
  RAFFLES: `${API_URL}/api/raffles`,
  RAFFLE: (id: string) => `${API_URL}/api/raffles/${id}`,
  RAFFLE_PURCHASE: (id: string) => `${API_URL}/api/raffles/${id}/purchase`,
  RAFFLE_WINNERS: (id: string) => `${API_URL}/api/raffles/${id}/winners`,
  RAFFLE_USER_TICKETS: (id: string) => `${API_URL}/api/raffles/${id}/tickets`,
  RAFFLES_ADMIN_ALL: `${API_URL}/api/raffles/admin/all`,
  RAFFLE_SELECT_WINNERS: (id: string) => `${API_URL}/api/raffles/${id}/select-winners`,
  RAFFLE_CANCEL: (id: string) => `${API_URL}/api/raffles/${id}/cancel`,

  // Public profiles
  USER_PUBLIC_PROFILE: (userId: string) => `${API_URL}/api/users/${userId}/profile`,

  // Leaderboard archive
  LEADERBOARDS_COMPLETED: `${API_URL}/api/manual-leaderboards?status=completed`,

  // Bonus Bingo
  BONUS_BINGO: `${API_URL}/api/bonus-bingo`,
  BONUS_BINGO_GAME: (id: string) => `${API_URL}/api/bonus-bingo/${id}`,
};
