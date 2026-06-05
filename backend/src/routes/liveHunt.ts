import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import { RedisService } from '@/config/redis';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const REDIS_KEY = 'live_hunt';

/* ── GET /api/live-hunt  ─ public ────────────────────────── */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const hunt = await RedisService.getJSON(REDIS_KEY);
    res.json({ success: true, hunt });
  })
);

/* ── POST /api/live-hunt  ─ admin: publish / update ─────── */
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const hunt = req.body;
    if (!hunt || !hunt.name) {
      res.status(400).json({ success: false, error: 'Invalid hunt data' });
      return;
    }
    hunt.publishedAt = new Date().toISOString();
    await RedisService.setJSON(REDIS_KEY, hunt);
    res.json({ success: true, hunt });
  })
);

/* ── DELETE /api/live-hunt  ─ admin: take down ───────────── */
router.delete(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    await RedisService.del(REDIS_KEY);
    res.json({ success: true });
  })
);

export default router;
