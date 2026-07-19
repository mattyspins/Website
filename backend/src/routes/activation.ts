import { Router, Response } from 'express';
import { prisma } from '@/config/database';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { DAILY_REWARD, isSameUTCDay } from '@/utils/dailyCheckIn';

const router = Router();

// GET /api/activation/status
//
// Backs the homepage activation checklist. Everything it reports already lives in
// User / UserStatistics; this endpoint exists so the checklist resolves in one
// round trip rather than fanning out to /auth/me, /checkin/status and a raffle
// lookup on every homepage load.
router.get(
  '/status',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        kickUsername: true,
        kickVerified: true,
        rainbetUsername: true,
        rainbetVerified: true,
        lastDailyCheckIn: true,
        statistics: { select: { totalRaffleTickets: true } },
      },
    });

    if (!user) throw createError.notFound('User not found');

    // Kick and Razed both have a real middle state: the user has submitted a
    // username but it is not verified yet (Razed verification is performed by an
    // admin). The UI needs to distinguish that from "not started", or it will keep
    // telling users to submit a username they have already submitted.
    res.json({
      success: true,
      steps: {
        kick: {
          done: user.kickVerified,
          pending: !user.kickVerified && Boolean(user.kickUsername),
          username: user.kickUsername,
        },
        dailyCheckIn: {
          done: user.lastDailyCheckIn
            ? isSameUTCDay(user.lastDailyCheckIn, new Date())
            : false,
          reward: DAILY_REWARD,
        },
        razed: {
          done: user.rainbetVerified,
          pending: !user.rainbetVerified && Boolean(user.rainbetUsername),
          username: user.rainbetUsername,
        },
        firstRaffle: {
          done: (user.statistics?.totalRaffleTickets ?? 0) > 0,
        },
      },
    });
  })
);

export default router;
