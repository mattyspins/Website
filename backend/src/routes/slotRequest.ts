import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { SlotRequestController } from '@/controllers/SlotRequestController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

// Public — anyone can check if requests are open (for a potential OBS widget)
router.get('/status', lim, SlotRequestController.getStatus);

// Admin only
router.get('/', authMiddleware, adminMiddleware, lim, SlotRequestController.getAll);
router.get('/pending', authMiddleware, adminMiddleware, lim, SlotRequestController.getPending);
router.post('/open', authMiddleware, adminMiddleware, lim, SlotRequestController.open);
router.post('/close', authMiddleware, adminMiddleware, lim, SlotRequestController.close);
router.delete('/clear', authMiddleware, adminMiddleware, lim, SlotRequestController.clearPending);
router.patch('/:id/add', authMiddleware, adminMiddleware, lim, SlotRequestController.markAdded);
router.patch('/:id/reject', authMiddleware, adminMiddleware, lim, SlotRequestController.markRejected);
router.delete('/:id', authMiddleware, adminMiddleware, lim, SlotRequestController.delete);

export default router;
