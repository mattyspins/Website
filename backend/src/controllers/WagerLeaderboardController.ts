import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { WagerLeaderboardService } from '@/services/WagerLeaderboardService';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class WagerLeaderboardController {
  static getActive = asyncHandler(async (_req, res) => {
    const race = await WagerLeaderboardService.getActiveRace();
    res.json({ success: true, race });
  });

  static getHistory = asyncHandler(async (_req, res) => {
    const races = await WagerLeaderboardService.getRaceHistory();
    res.json({ success: true, races });
  });

  static getAdminWagers = asyncHandler(async (_req, res) => {
    const users = await WagerLeaderboardService.getAdminWagerList();
    res.json({ success: true, users });
  });

  static getAllWagerers = asyncHandler(async (_req, res) => {
    const wagerers = await WagerLeaderboardService.getAllWagerers();
    res.json({ success: true, wagerers });
  });

  static listRaces = asyncHandler(async (_req, res) => {
    const races = await WagerLeaderboardService.listRaces();
    res.json({ success: true, races });
  });

  static createRace = asyncHandler(async (req, res) => {
    const { startDate, endDate, totalPrizePool, prizes } = req.body;
    if (!startDate || !endDate || totalPrizePool === undefined || !Array.isArray(prizes)) {
      res.status(400).json({ error: 'startDate, endDate, totalPrizePool, and prizes are required' });
      return;
    }
    try {
      const race = await WagerLeaderboardService.createRace({ startDate, endDate, totalPrizePool: Number(totalPrizePool), prizes });
      res.json({ success: true, race });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  static updateRace = asyncHandler(async (req, res) => {
    const { raceId } = req.params;
    try {
      const race = await WagerLeaderboardService.updateRace(raceId, req.body);
      res.json({ success: true, race });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  static deleteRace = asyncHandler(async (req, res) => {
    const { raceId } = req.params;
    try {
      await WagerLeaderboardService.deleteRace(raceId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  static resync = asyncHandler(async (_req, res) => {
    await RazedWagerSyncService.syncSinceLaunch();
    res.json({ success: true });
  });
}
