import { Router } from 'express';
import { authMiddleware, moderatorMiddleware } from '@/middleware/auth';
import { HuntController } from '@/controllers/HuntController';

const router = Router();

router.get('/', authMiddleware, HuntController.list);
router.get('/:id', authMiddleware, HuntController.get);
router.put('/:id', authMiddleware, moderatorMiddleware, HuntController.upsert);
router.delete('/:id', authMiddleware, moderatorMiddleware, HuntController.remove);

export default router;
