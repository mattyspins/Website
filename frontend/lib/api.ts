// API Configuration
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const accessToken = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
};

// API Client
export const api = {
  get: async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: getAuthHeaders(),
      ...options,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`,
      );
    }

    return response.json();
  },

  post: async (endpoint: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`,
      );
    }

    return response.json();
  },

  put: async (endpoint: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      ...options,
    });
    return response.json();
  },

  patch: async (endpoint: string, data?: any, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`,
      );
    }

    return response.json();
  },

  delete: async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      ...options,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`,
      );
    }

    return response.json();
  },
};

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_ME: `${API_URL}/api/auth/me`,
  AUTH_DISCORD_INITIATE: `${API_URL}/api/auth/discord/initiate`,
  AUTH_LOGOUT: `${API_URL}/api/auth/logout`,
  AUTH_KICK_VERIFY: `${API_URL}/api/auth/kick/verify`,

  // Admin
  ADMIN_USERS_SEARCH: `${API_URL}/api/admin/users/search`,
  ADMIN_USER_POINTS: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/points`,
  ADMIN_USER_MODERATOR: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/moderator`,
  ADMIN_USER_SUSPEND: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/suspend`,
  ADMIN_USER_UNSUSPEND: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/unsuspend`,
  ADMIN_VERIFY_RAINBET: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/verify-rainbet`,
  ADMIN_VERIFY_KICK: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/verify-kick`,
  ADMIN_EDIT_KICK_USERNAME: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/kick-username`,
  ADMIN_EDIT_RAINBET_USERNAME: (userId: string) =>
    `${API_URL}/api/admin/users/${userId}/rainbet-username`,
  ADMIN_STATS: `${API_URL}/api/admin/dashboard/stats`,
  ADMIN_AUDIT_LOGS: `${API_URL}/api/admin/audit-logs`,

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
  USERS_RAINBET: `${API_URL}/api/auth/rainbet-username`,

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

  // Schedule
  SCHEDULE_CURRENT: `${API_URL}/api/schedule/current`,
  SCHEDULE_TODAY: `${API_URL}/api/schedule/today`,
  SCHEDULE_LIVE: `${API_URL}/api/schedule/live`,
  SCHEDULE_UPDATE: `${API_URL}/api/schedule/update`,
};
