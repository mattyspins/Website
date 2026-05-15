import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { authMiddleware, adminMiddleware } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

// GET /api/stream-events — public, returns upcoming events
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await prisma.streamEvent.findMany({
      where: { scheduledAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });
    res.json({ success: true, events });
  })
);

// GET /api/stream-events/all — admin, all events including past
router.get(
  '/all',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await prisma.streamEvent.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, events });
  })
);

// POST /api/stream-events — admin: create
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, scheduledAt, gameType, description } = req.body;
    if (!title || !scheduledAt) throw createError.badRequest('title and scheduledAt are required');
    const event = await prisma.streamEvent.create({
      data: { title, scheduledAt: new Date(scheduledAt), gameType, description },
    });
    logger.info(`Admin ${req.user!.id} created stream event: ${title}`);
    res.json({ success: true, event });
  })
);

// PATCH /api/stream-events/:id — admin: update
router.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, scheduledAt, gameType, description, isLive } = req.body;
    const event = await prisma.streamEvent.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(gameType !== undefined && { gameType }),
        ...(description !== undefined && { description }),
        ...(isLive !== undefined && { isLive }),
      },
    });
    res.json({ success: true, event });
  })
);

// DELETE /api/stream-events/:id — admin
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await prisma.streamEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
