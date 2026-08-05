import { Router } from 'express';
import rateLimit from '@/config/rateLimit';
import { LiftController } from '@/controllers/LiftController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/active', lim, LiftController.getActive);
router.get('/:id', lim, LiftController.getById);
router.post('/', authMiddleware, adminMiddleware, lim, LiftController.create);
router.post('/:id/advance-ready', authMiddleware, adminMiddleware, lim, LiftController.advanceToReady);
router.post('/:id/start', authMiddleware, adminMiddleware, lim, LiftController.start);
router.post('/:id/cancel', authMiddleware, adminMiddleware, lim, LiftController.cancel);

export default router;
