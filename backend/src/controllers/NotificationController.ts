import { Response } from 'express';
import { NotificationService } from '@/services/NotificationService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

export class NotificationController {
  // Get user notifications
  static getUserNotifications = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { limit = '50', offset = '0', unreadOnly = 'false' } = req.query;

      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
      const unreadOnlyBool = unreadOnly === 'true';

      try {
        const result = await NotificationService.getUserNotifications(
          req.user.id,
          limitNum,
          offsetNum,
          unreadOnlyBool
        );

        res.json({
          success: true,
          data: {
            notifications: result.notifications,
            pagination: {
              limit: limitNum,
              offset: offsetNum,
              total: result.total,
              hasMore: offsetNum + limitNum < result.total,
            },
            unreadCount: result.unreadCount,
          },
        });
      } catch (error) {
        logger.error('Error getting notifications:', error);
        throw createError.internal('Failed to get notifications');
      }
    }
  );

  // Get unread count
  static getUnreadCount = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        const result = await NotificationService.getUserNotifications(
          req.user.id,
          1,
          0,
          false
        );

        res.json({
          success: true,
          data: {
            unreadCount: result.unreadCount,
          },
        });
      } catch (error) {
        logger.error('Error getting unread count:', error);
        throw createError.internal('Failed to get unread count');
      }
    }
  );

  // Mark notification as read
  static markAsRead = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { notificationId } = req.params;

      if (!notificationId) {
        throw createError.badRequest('Notification ID is required');
      }

      try {
        await NotificationService.markAsRead(notificationId, req.user.id);

        res.json({
          success: true,
          message: 'Notification marked as read',
        });
      } catch (error) {
        logger.error('Error marking notification as read:', error);
        throw error;
      }
    }
  );

  // Mark all as read
  static markAllAsRead = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        const count = await NotificationService.markAllAsRead(req.user.id);

        res.json({
          success: true,
          data: {
            markedCount: count,
          },
          message: `Marked ${count} notifications as read`,
        });
      } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        throw createError.internal('Failed to mark notifications as read');
      }
    }
  );

  // Delete notification
  static deleteNotification = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { notificationId } = req.params;

      if (!notificationId) {
        throw createError.badRequest('Notification ID is required');
      }

      try {
        await NotificationService.deleteNotification(
          notificationId,
          req.user.id
        );

        res.json({
          success: true,
          message: 'Notification deleted',
        });
      } catch (error) {
        logger.error('Error deleting notification:', error);
        throw error;
      }
    }
  );
}
