import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { MILESTONE_TIERS } from '@/routes/milestones';

const router = Router();

// GET /api/users/:userId/profile — public profile
router.get(
  '/:userId/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        totalWagered: true,
        totalDeposited: true,
        createdAt: true,
        kickUsername: true,
        kickVerified: true,
        rainbetUsername: true,
        rainbetVerified: true,
        milestoneClaims: { select: { tierId: true, status: true } },
      },
    });

    if (!user) throw createError.notFound('User not found');

    const totalWagered = Number(user.totalWagered);
    const tiers = MILESTONE_TIERS.map((t) => {
      const claim = user.milestoneClaims.find((c) => c.tierId === t.id);
      return {
        ...t,
        unlocked: totalWagered >= t.wagerRequired,
        claimStatus: claim?.status ?? null,
      };
    });

    res.json({
      success: true,
      profile: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        totalWagered,
        totalDeposited: Number(user.totalDeposited),
        createdAt: user.createdAt,
        kickUsername: user.kickVerified ? user.kickUsername : null,
        rainbetVerified: user.rainbetVerified,
        tiers,
        unlockedCount: tiers.filter((t) => t.unlocked).length,
      },
    });
  })
);

export default router;
