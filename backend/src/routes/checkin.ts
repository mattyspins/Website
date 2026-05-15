import { Router, Response } from 'express';
import { prisma } from '@/config/database';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();
const DAILY_REWARD = 5;

function isSameUTCDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { lastDailyCheckIn: true, points: true },
    });
    if (!user) throw createError.notFound('User not found');

    const now = new Date();
    if (user.lastDailyCheckIn && isSameUTCDay(user.lastDailyCheckIn, now)) {
      throw createError.badRequest('Already claimed today');
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        points: { increment: DAILY_REWARD },
        totalEarned: { increment: DAILY_REWARD },
        lastDailyCheckIn: now,
      },
      select: { points: true },
    });

    await prisma.pointTransaction.create({
      data: {
        userId: req.user!.id,
        amount: DAILY_REWARD,
        transactionType: 'daily_checkin',
        reason: 'Daily check-in reward',
      },
    });

    logger.info(`Daily check-in: user ${req.user!.id} claimed ${DAILY_REWARD} coins`);
    res.json({ success: true, reward: DAILY_REWARD, newBalance: updated.points });
  })
);

export default router;
