import { api } from "../api";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationApi = {
  // Get user notifications
  getNotifications: async (
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false,
  ): Promise<NotificationsResponse> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      unreadOnly: unreadOnly.toString(),
    });
    return api.get(`/api/notifications?${params}`);
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get("/api/notifications?limit=1");
    return response.unreadCount;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/api/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ count: number }> => {
    return api.patch("/api/notifications/read-all");
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<void> => {
    await api.delete(`/api/notifications/${notificationId}`);
  },
};
