import { Router, Response } from 'express';
import { prisma } from '@/config/database';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { DAILY_REWARD, isSameUTCDay } from '@/utils/dailyCheckIn';

const router = Router();

// GET /api/checkin/status
router.get(
  '/status',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { lastDailyCheckIn: true, points: true },
    });
    const now = new Date();
    const alreadyClaimed = user?.lastDailyCheckIn
      ? isSameUTCDay(user.lastDailyCheckIn, now)
      : false;
    res.json({ success: true, alreadyClaimed, reward: DAILY_REWARD, points: user?.points ?? 0 });
  })
);

// POST /api/checkin/claim
router.post(
  '/claim',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Atomic guard: the WHERE clause is evaluated by Postgres as part of the same UPDATE,
    // so two concurrent claims can't both read a stale "not claimed yet" state and both
    // award points — only one can ever match and increment.
    const updated = await prisma.user.updateMany({
      where: {
        id: req.user!.id,
        OR: [{ lastDailyCheckIn: null }, { lastDailyCheckIn: { lt: startOfTodayUTC } }],
      },
      data: {
        points: { increment: DAILY_REWARD },
        totalEarned: { increment: DAILY_REWARD },
        lastDailyCheckIn: now,
      },
    });

    if (updated.count === 0) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true } });
      if (!user) throw createError.notFound('User not found');
      throw createError.badRequest('Already claimed today');
    }

    await prisma.pointTransaction.create({
      data: {
        userId: req.user!.id,
        amount: DAILY_REWARD,
        transactionType: 'daily_checkin',
        reason: 'Daily check-in reward',
      },
    });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { points: true } });

    logger.info(`Daily check-in: user ${req.user!.id} claimed ${DAILY_REWARD} coins`);
    res.json({ success: true, reward: DAILY_REWARD, newBalance: user?.points ?? 0 });
  })
);

export default router;
