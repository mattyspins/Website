import { Router } from 'express';
import { StoreController } from '@/controllers/StoreController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for store endpoints
const storeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    error: 'Too many store requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const purchaseLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 purchase requests per minute
  message: {
    error: 'Too many purchase attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 admin requests per 5 minutes
  message: {
    error: 'Too many admin requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get('/items', storeLimiter, StoreController.getStoreItems);
router.get('/items/:itemId', storeLimiter, StoreController.getStoreItem);
router.get('/categories', storeLimiter, StoreController.getStoreCategories);
router.get('/stats', storeLimiter, StoreController.getStoreStatistics);

// Protected routes (require authentication)
router.post(
  '/purchase',
  purchaseLimiter,
  authMiddleware,
  StoreController.purchaseItem
);
router.get(
  '/purchases/:userId?',
  storeLimiter,
  authMiddleware,
  StoreController.getUserPurchases
);

// Admin routes
router.post(
  '/admin/items',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.createStoreItem
);
router.put(
  '/admin/items/:itemId',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.updateStoreItem
);
router.delete(
  '/admin/items/:itemId',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.deleteStoreItem
);
router.patch(
  '/admin/items/:itemId/inventory',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.updateInventory
);
router.post(
  '/admin/refund/:purchaseId',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.processRefund
);
router.post(
  '/admin/complete/:purchaseId',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.completePurchase
);
router.get(
  '/admin/purchases',
  adminLimiter,
  authMiddleware,
  adminMiddleware,
  StoreController.getAllPurchases
);

export default router;
