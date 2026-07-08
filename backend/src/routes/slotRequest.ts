import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { SlotRequestController } from '@/controllers/SlotRequestController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

// Public — for OBS widget (no auth required)
router.get('/status', lim, SlotRequestController.getStatus);
router.get('/widget', lim, SlotRequestController.getWidget);

// Admin only
router.get('/', authMiddleware, adminMiddleware, lim, SlotRequestController.getAll);
router.get('/pending', authMiddleware, adminMiddleware, lim, SlotRequestController.getPending);
router.post('/open', authMiddleware, adminMiddleware, lim, SlotRequestController.open);
router.post('/close', authMiddleware, adminMiddleware, lim, SlotRequestController.close);
router.delete('/clear', authMiddleware, adminMiddleware, lim, SlotRequestController.clearPending);
router.delete('/clear-all', authMiddleware, adminMiddleware, lim, SlotRequestController.clearAll);
router.patch('/:id/add', authMiddleware, adminMiddleware, lim, SlotRequestController.markAdded);
router.patch('/:id/reject', authMiddleware, adminMiddleware, lim, SlotRequestController.markRejected);
router.delete('/:id', authMiddleware, adminMiddleware, lim, SlotRequestController.delete);

export default router;
