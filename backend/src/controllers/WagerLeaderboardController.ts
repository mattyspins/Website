import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { WagerLeaderboardService, RaceType } from '@/services/WagerLeaderboardService';
import { RazedWagerSyncService } from '@/services/RazedWagerSyncService';

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function parseType(value: unknown): RaceType | null {
  return value === 'WEEKLY' || value === 'MONTHLY' ? value : null;
}

/**
 * Race schedules and prize splits are hardcoded in `@/config/wagerRaces` and
 * reconciled by `WagerRaceScheduler`, so there are deliberately no create/update/
 * delete endpoints here — changing a race means editing that config and deploying.
 * Resync stays because it only re-pulls wager data from Razed; it can't alter a race.
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

  static resync = asyncHandler(async (_req, res) => {
    const { alreadyRunning } = RazedWagerSyncService.startSyncSinceLaunch();
    res.json({ success: true, alreadyRunning });
  });

  static resyncStatus = asyncHandler(async (_req, res) => {
    res.json({ success: true, ...RazedWagerSyncService.getSyncSinceLaunchState() });
  });
}
