import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

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
    let claims: { tierId: number; status: string }[] = [];

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const { AuthService } = await import('@/services/AuthService');
        const session = await AuthService.getUserSession(token);
        if (session) {
          totalWagered = session.totalWagered ?? 0;
          const dbClaims = await prisma.milestoneClaim.findMany({
            where: { userId: session.id },
            select: { tierId: true, status: true },
          });
          claims = dbClaims;
        }
      } catch {
        // ignore
      }
    }

    const tiers = MILESTONE_TIERS.map((t) => {
      const claim = claims.find((c) => c.tierId === t.id);
      return {
        ...t,
        unlocked: totalWagered >= t.wagerRequired,
        claimStatus: claim?.status ?? null,
      };
    });

    res.json({ success: true, totalWagered, tiers });
  })
);

// POST /api/milestones/claim — authenticated, claim an unlocked milestone
router.post(
  '/claim',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tierId } = req.body as { tierId: number };
    const tier = MILESTONE_TIERS.find((t) => t.id === Number(tierId));
    if (!tier) throw createError.badRequest('Invalid tier');

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { totalWagered: true, displayName: true, discordId: true },
    });
    if (!user) throw createError.notFound('User not found');

    if (Number(user.totalWagered) < tier.wagerRequired) {
      throw createError.badRequest('Milestone not yet unlocked');
    }

    // Upsert — prevent duplicate claims
    const existing = await prisma.milestoneClaim.findUnique({
      where: { userId_tierId: { userId: req.user!.id, tierId: tier.id } },
    });
    if (existing) {
      return res.json({ success: true, claim: existing, alreadyClaimed: true });
    }

    const claim = await prisma.milestoneClaim.create({
      data: {
        userId: req.user!.id,
        tierId: tier.id,
        tierName: tier.name,
        reward: tier.reward,
        status: 'pending',
      },
    });

    logger.info(`Milestone claim: user ${req.user!.id} claimed tier ${tier.name}`);

    // Discord webhook notification
    const webhookUrl = process.env['DISCORD_MILESTONE_WEBHOOK'];
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🏆 Milestone Claim',
            color: 0xF5A623,
            fields: [
              { name: 'User', value: user.displayName, inline: true },
              { name: 'Discord ID', value: user.discordId, inline: true },
              { name: 'Tier', value: tier.name, inline: true },
              { name: 'Reward', value: `$${tier.reward}`, inline: true },
              { name: 'Wagered', value: `$${Number(user.totalWagered).toLocaleString()}`, inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {});
    }

    res.json({ success: true, claim });
  })
);

// GET /api/milestones/claims — admin: list all pending claims
router.get(
  '/claims',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const claims = await prisma.milestoneClaim.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true, discordId: true, avatarUrl: true } },
      },
    });
    res.json({ success: true, claims });
  })
);

// PATCH /api/milestones/claims/:claimId — admin: approve/reject
router.patch(
  '/claims/:claimId',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body as { status: 'approved' | 'rejected' };
    if (!['approved', 'rejected'].includes(status)) {
      throw createError.badRequest('status must be approved or rejected');
    }
    const claim = await prisma.milestoneClaim.update({
      where: { id: req.params.claimId },
      data: { status },
    });
    res.json({ success: true, claim });
  })
);

// PATCH /api/milestones/users/:userId/wager — admin: set totalWagered
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
    logger.info(`Admin ${req.user!.id} set totalWagered for ${userId} to ${totalWagered}`);
    res.json({ success: true, user });
  })
);

// PATCH /api/milestones/users/:userId/deposit — admin: set totalDeposited
router.patch(
  '/users/:userId/deposit',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { totalDeposited } = req.body as { totalDeposited: number };
    if (totalDeposited === undefined || isNaN(Number(totalDeposited)) || Number(totalDeposited) < 0) {
      throw createError.badRequest('totalDeposited must be a non-negative number');
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { totalDeposited: Number(totalDeposited) },
      select: { id: true, displayName: true, totalDeposited: true },
    });
    logger.info(`Admin ${req.user!.id} set totalDeposited for ${userId} to ${totalDeposited}`);
    res.json({ success: true, user });
  })
);

export default router;
