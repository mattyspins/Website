import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

// Milestone tiers — wagerRequired is USD, reward is USD cash payout
export const MILESTONE_TIERS = [
  { id: 1, name: 'Rookie',      wagerRequired: 10_000,    reward: 25   },
  { id: 2, name: 'Hustler',     wagerRequired: 25_000,    reward: 50   },
  { id: 3, name: 'Grinder',     wagerRequired: 50_000,    reward: 100  },
  { id: 4, name: 'High Roller', wagerRequired: 100_000,   reward: 150  },
  { id: 5, name: 'VIP',         wagerRequired: 250_000,   reward: 250  },
  { id: 6, name: 'Elite',       wagerRequired: 500_000,   reward: 500  },
  { id: 7, name: 'Diamond',     wagerRequired: 700_000,   reward: 750  },
  { id: 8, name: 'Legend',      wagerRequired: 1_300_000, reward: 1000 },
];

// GET /api/milestones — public, returns tiers + caller's progress if logged in
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    let totalWagered = 0;

    // Optionally enrich with user's wager if they send a token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { RedisService } = await import('@/config/redis');
        const token = authHeader.slice(7);
        const crypto = await import('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await prisma.userSession.findFirst({
          where: { tokenHash, expiresAt: { gt: new Date() } },
          include: { user: { select: { totalWagered: true } } },
        });
        if (session?.user) {
          totalWagered = Number(session.user.totalWagered);
        }
      } catch {
        // ignore — just return unauthenticated view
      }
    }

    const tiers = MILESTONE_TIERS.map((t) => ({
      ...t,
      unlocked: totalWagered >= t.wagerRequired,
    }));

    res.json({ success: true, totalWagered, tiers });
  })
);

// PATCH /api/milestones/users/:userId/wager — admin only
router.patch(
  '/users/:userId/wager',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { totalWagered } = req.body as { totalWagered: number };

    if (totalWagered === undefined || isNaN(Number(totalWagered)) || Number(totalWagered) < 0) {
      throw createError.badRequest('totalWagered must be a non-negative number');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { totalWagered: Number(totalWagered) },
      select: { id: true, displayName: true, totalWagered: true },
    });

    logger.info(`Admin ${req.user!.id} set totalWagered for user ${userId} to ${totalWagered}`);
    res.json({ success: true, user });
  })
);

export default router;
