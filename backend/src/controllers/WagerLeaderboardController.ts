import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { WagerLeaderboardService } from '@/services/WagerLeaderboardService';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class WagerLeaderboardController {
  static getMonthly = asyncHandler(async (_req, res) => {
    const standings = await WagerLeaderboardService.getMonthlyStandings();
    res.json({ success: true, standings });
  });

  static getMonthlyHistory = asyncHandler(async (_req, res) => {
    const history = await WagerLeaderboardService.getMonthlyHistory();
    res.json({ success: true, history });
  });

  static getAdminWagers = asyncHandler(async (_req, res) => {
    const users = await WagerLeaderboardService.getAdminWagerList();
    res.json({ success: true, users });
  });

  static getAllWagerers = asyncHandler(async (_req, res) => {
    const wagerers = await WagerLeaderboardService.getAllWagerers();
    res.json({ success: true, wagerers });
  });

  static getPrizes = asyncHandler(async (_req, res) => {
    const prizes = await WagerLeaderboardService.getPrizes();
    res.json({ success: true, prizes });
  });

  static setPrizes = asyncHandler(async (req, res) => {
    const { prizes } = req.body;
    if (!Array.isArray(prizes)) {
      res.status(400).json({ error: 'prizes must be an array of { position, points }' });
      return;
    }
    const updated = await WagerLeaderboardService.setPrizes(prizes);
    res.json({ success: true, prizes: updated });
  });

  static resync = asyncHandler(async (_req, res) => {
    await RazedWagerSyncService.syncRecentDays(2);
    res.json({ success: true });
  });
}
