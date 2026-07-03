import { Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { HuntService } from '@/services/HuntService';

export class HuntController {
  static list = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const hunts = await HuntService.listAll();
    res.json({ success: true, hunts });
  });

  static get = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const hunt = await HuntService.get(req.params.id as string);
    if (!hunt) {
      res.status(404).json({ success: false, error: 'Hunt not found' });
      return;
    }
    res.json({ success: true, hunt });
  });

  static upsert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const { name, date, currency, startCost, bonuses, isStarted, isCompleted, gtbGameId, createdAt } = req.body;

    if (!name || typeof startCost !== 'number' || !Array.isArray(bonuses)) {
      res.status(400).json({ success: false, error: 'Invalid hunt data' });
      return;
    }

    const hunt = await HuntService.upsert(id, {
      name,
      date,
      currency,
      startCost,
      bonuses,
      isStarted: !!isStarted,
      isCompleted: !!isCompleted,
      gtbGameId: gtbGameId ?? null,
      createdAt: createdAt || new Date().toISOString(),
    });
    res.json({ success: true, hunt });
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await HuntService.remove(req.params.id as string);
    res.json({ success: true });
  });
}
