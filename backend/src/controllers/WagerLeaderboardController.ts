import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { WagerLeaderboardService, RaceType } from '@/services/WagerLeaderboardService';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function parseType(value: unknown): RaceType | null {
  return value === 'WEEKLY' || value === 'MONTHLY' ? value : null;
}

export class WagerLeaderboardController {
  static getActive = asyncHandler(async (req, res) => {
    const type = parseType(req.query.type);
    if (!type) {
      res.status(400).json({ error: "type must be 'WEEKLY' or 'MONTHLY'" });
      return;
    }
    const race = await WagerLeaderboardService.getActiveRace(type);
    res.json({ success: true, race });
  });

  static getHistory = asyncHandler(async (req, res) => {
    const type = parseType(req.query.type);
    if (!type) {
      res.status(400).json({ error: "type must be 'WEEKLY' or 'MONTHLY'" });
      return;
    }
    const races = await WagerLeaderboardService.getRaceHistory(type);
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

  static getWagerTotals = asyncHandler(async (_req, res) => {
    const totals = await WagerLeaderboardService.getWagerTotals();
    res.json({ success: true, totals });
  });

  static listRaces = asyncHandler(async (req, res) => {
    const type = parseType(req.query.type);
    if (!type) {
      res.status(400).json({ error: "type must be 'WEEKLY' or 'MONTHLY'" });
      return;
    }
    const races = await WagerLeaderboardService.listRaces(type);
    res.json({ success: true, races });
  });

  static createRace = asyncHandler(async (req, res) => {
    const { startDate, endDate, totalPrizePool, prizes } = req.body;
    const type = parseType(req.body.type);
    if (!type || !startDate || !endDate || totalPrizePool === undefined || !Array.isArray(prizes)) {
      res.status(400).json({ error: "type ('WEEKLY'|'MONTHLY'), startDate, endDate, totalPrizePool, and prizes are required" });
      return;
    }
    try {
      const race = await WagerLeaderboardService.createRace({ type, startDate, endDate, totalPrizePool: Number(totalPrizePool), prizes });
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
    const result = await RazedWagerSyncService.syncSinceLaunch();
    res.json({ success: result.failedDays.length === 0, syncedDays: result.syncedDays, failedDays: result.failedDays });
  });
}
