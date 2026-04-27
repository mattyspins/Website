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
  USERS_RAINBET: `${API_URL}/api/users/rainbet`,
};
