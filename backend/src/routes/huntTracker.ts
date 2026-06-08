import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';

const router = Router();

/* GET /api/hunt-tracker — admin: list all hunts */
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const sessions = await prisma.huntTrackerSession.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, hunts: sessions.map((s) => s.data) });
  })
);

/* PUT /api/hunt-tracker/:huntId — admin: upsert a hunt */
router.put(
  '/:huntId',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { huntId } = req.params;
    const hunt = req.body;

    if (!hunt || typeof hunt !== 'object' || !hunt.name) {
      throw createError.badRequest('Invalid hunt data');
    }

    const session = await prisma.huntTrackerSession.upsert({
      where: { id: huntId },
      create: { id: huntId, userId: req.user!.id, data: hunt },
      update: { data: hunt },
    });

    res.json({ success: true, hunt: session.data });
  })
);

/* DELETE /api/hunt-tracker/:huntId — admin: delete a hunt */
router.delete(
  '/:huntId',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { huntId } = req.params;

    await prisma.huntTrackerSession.deleteMany({ where: { id: huntId } });
    res.json({ success: true });
  })
);

export default router;
