import { Router } from 'express';
import { NotificationController } from '@/controllers/NotificationController';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', NotificationController.getUserNotifications);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', NotificationController.markAsRead);

// Mark all as read
router.post('/mark-all-read', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', NotificationController.deleteNotification);

export default router;
