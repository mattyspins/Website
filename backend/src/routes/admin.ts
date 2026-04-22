import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // limit each IP to 100 requests per 5 minutes
  message: {
    error: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const criticalActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 critical actions per 5 minutes
  message: {
    error: 'Too many critical actions, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(adminLimiter);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// User Management
router.get('/users/search', AdminController.searchUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.patch('/users/:userId/profile', AdminController.updateUserProfile);
router.post(
  '/users/:userId/moderator',
  criticalActionLimiter,
  AdminController.toggleModeratorStatus
);
router.post(
  '/users/:userId/points',
  criticalActionLimiter,
  AdminController.adjustUserPoints
);
router.post(
  '/users/bulk/points',
  criticalActionLimiter,
  AdminController.bulkAdjustPoints
);
router.post(
  '/users/:userId/suspend',
  criticalActionLimiter,
  AdminController.suspendUser
);
router.post(
  '/users/:userId/unsuspend',
  criticalActionLimiter,
  AdminController.unsuspendUser
);
router.delete(
  '/users/:userId',
  criticalActionLimiter,
  AdminController.deleteUser
);

// Transaction Management
router.get(
  '/users/:userId/transactions',
  AdminController.getUserTransactionHistory
);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// System Configuration
router.get('/system/config', AdminController.getSystemConfig);
router.put(
  '/system/config',
  criticalActionLimiter,
  AdminController.updateSystemConfig
);

// Note: Leaderboard, Store, and Raffle admin endpoints are in their respective route files
// This keeps the admin routes focused on user management, system config, and audit logs

export default router;
