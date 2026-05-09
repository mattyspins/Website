import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface CreateNotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: Date;
  readAt?: Date;
}

export class NotificationService {
  // Create a notification
  static async createNotification(
    request: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: request.userId,
          type: request.type,
          title: request.title,
          message: request.message,
          channels: ['web'], // Default to web notifications
          priority: 'normal',
          metadata: request.metadata || {},
        },
      });

      logger.info(
        `Notification created: ${notification.type} for user ${request.userId}`
      );

      return {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: !!notification.readAt,
        actionUrl: (notification.metadata as any)?.actionUrl,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        readAt: notification.readAt || undefined,
      };
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw createError.internal('Failed to create notification');
    }
  }

  // Get user notifications
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const where: any = { userId };

      if (unreadOnly) {
        where.readAt = null;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, readAt: null },
        }),
      ]);

      return {
        notifications: notifications.map(n => ({
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          read: !!n.readAt,
          actionUrl: (n.metadata as any)?.actionUrl,
          metadata: n.metadata,
          createdAt: n.createdAt,
          readAt: n.readAt || undefined,
        })),
        total,
        unreadCount,
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw createError.internal('Failed to get notifications');
    }
  }

  // Mark notification as read
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw createError.notFound('Notification not found');
      }

      if (notification.userId !== userId) {
        throw createError.forbidden(
          'Cannot mark other user notifications as read'
        );
      }

      if (notification.readAt) {
        return; // Already read
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });

      logger.info(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      logger.info(
        `Marked ${result.count} notifications as read for user ${userId}`
      );
      return result.count;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw createError.internal('Failed to mark notifications as read');
    }
  }

  // Delete notification
  static async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw createError.notFound('Notification not found');
      }

      if (notification.userId !== userId) {
        throw createError.forbidden('Cannot delete other user notifications');
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      logger.info(`Notification deleted: ${notificationId}`);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Helper methods for creating specific notification types

  static async notifyPurchase(
    userId: string,
    itemName: string,
    points: number,
    purchaseId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'purchase',
      title: '🛒 Purchase Successful',
      message: `You purchased ${itemName} for ${points.toLocaleString()} points`,
      metadata: {
        actionUrl: '/profile/purchases',
        purchaseId,
        itemName,
        points,
      },
    });
  }

  static async notifyGameWin(
    userId: string,
    gameTitle: string,
    points: number,
    gameId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'game_win',
      title: '🎉 You Won!',
      message: `Congratulations! You won ${points.toLocaleString()} points in "${gameTitle}"`,
      metadata: {
        actionUrl: '/profile',
        gameId,
        gameTitle,
        points,
      },
    });
  }

  static async notifyAdminPurchase(
    userId: string,
    userName: string,
    itemName: string,
    points: number,
    purchaseId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'admin_purchase',
      title: '🛒 New Purchase',
      message: `${userName} purchased ${itemName} for ${points.toLocaleString()} points`,
      metadata: {
        actionUrl: '/admin/store?tab=purchases',
        purchaseId,
        userName,
        itemName,
        points,
      },
    });
  }

  static async notifyRefund(
    userId: string,
    itemName: string,
    points: number,
    reason: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'refund',
      title: '💰 Refund Processed',
      message: `Your purchase of ${itemName} has been refunded. ${points.toLocaleString()} points returned.`,
      metadata: {
        actionUrl: '/profile/purchases',
        itemName,
        points,
        reason,
      },
    });
  }

  static async notifyPointsAwarded(
    userId: string,
    points: number,
    reason: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'points_awarded',
      title: '💎 Points Awarded',
      message: `You received ${points.toLocaleString()} points! ${reason}`,
      metadata: {
        actionUrl: '/profile',
        points,
        reason,
      },
    });
  }
}
