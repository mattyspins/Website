import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { WagerLeaderboardService, RaceType } from '@/services/WagerLeaderboardService';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function parseType(value: unknown): RaceType | null {
  return value === 'WEEKLY' || value === 'MONTHLY' ? value : null;
}

/** Admin standings default to a deep slice; `null` means the caller sent something unusable. */
function parseLimit(value: unknown): number | null {
  if (value === undefined) return 100;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1000) return null;
  return n;
}

/**
 * Races are stored in the database and managed from /admin/leaderboards. There is no
 * code-side schedule that overwrites them: whatever an admin saves here is authoritative,
 * including for the weekly race, which no longer rolls itself over.
 */
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

  static listRaces = asyncHandler(async (req, res) => {
    const type = parseType(req.query.type);
    if (!type) {
      res.status(400).json({ error: "type must be 'WEEKLY' or 'MONTHLY'" });
      return;
    }
    const races = await WagerLeaderboardService.listRaces(type);
    res.json({ success: true, races });
  });

  static getRaceStandings = asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit);
    if (limit === null) {
      res.status(400).json({ error: 'limit must be an integer between 1 and 1000' });
      return;
    }
    const race = await WagerLeaderboardService.getRaceStandings(req.params.raceId, limit);
    if (!race) {
      res.status(404).json({ error: 'Race not found' });
      return;
    }
    res.json({ success: true, race });
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
    const { alreadyRunning } = RazedWagerSyncService.startSyncSinceLaunch();
    res.json({ success: true, alreadyRunning });
  });

  static resyncStatus = asyncHandler(async (_req, res) => {
    res.json({ success: true, ...RazedWagerSyncService.getSyncSinceLaunchState() });
  });
}
