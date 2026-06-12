import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ViewerPickerController } from '@/controllers/ViewerPickerController';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';

const router = Router();
const lim = rateLimit({ windowMs: 5 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

router.get('/', authMiddleware, adminMiddleware, lim, ViewerPickerController.getAll);
router.get('/active', lim, ViewerPickerController.getActive);
router.post('/', authMiddleware, adminMiddleware, lim, ViewerPickerController.create);
router.post('/:id/close', authMiddleware, adminMiddleware, lim, ViewerPickerController.close);
router.post('/:id/draw', authMiddleware, adminMiddleware, lim, ViewerPickerController.drawWinner);
router.post('/:id/add-entry', authMiddleware, adminMiddleware, lim, ViewerPickerController.addEntry);
router.delete('/:id', authMiddleware, adminMiddleware, lim, ViewerPickerController.deletePicker);

export default router;
