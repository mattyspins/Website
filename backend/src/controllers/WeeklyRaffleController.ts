import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { WeeklyRaffleService, WeeklyRaffleRequirement } from '@/services/WeeklyRaffleService';
import { createError } from '@/middleware/errorHandler';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setWeeklyRaffleIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function parseRequirements(input: unknown): WeeklyRaffleRequirement[] {
  if (!Array.isArray(input)) return [];
  const out: WeeklyRaffleRequirement[] = [];
  for (const r of input) {
    if (r && r.type === 'MIN_WEEKLY_WAGER' && Number(r.value) > 0) {
      out.push({ type: 'MIN_WEEKLY_WAGER', value: Number(r.value) });
    }
  }
  return out;
}

export class WeeklyRaffleController {
  // Admin
  static create = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) throw createError.forbidden('Admin access required');
    const requirements = parseRequirements(req.body.requirements);
    const raffle = await WeeklyRaffleService.createForCurrentWeek(requirements, req.user.id);
    res.status(201).json({ success: true, raffle });
  });

  static getEligiblePreview = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) throw createError.forbidden('Admin access required');
    const participants = await WeeklyRaffleService.getEligibleParticipants(req.params.id);
    res.json({ success: true, participants, count: participants.length });
  });

  static getHistory = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const history = await WeeklyRaffleService.getHistory(limit);
    res.json({ success: true, history });
  });

  static draw = asyncHandler(async (req, res) => {
    if (!req.user?.isAdmin) throw createError.forbidden('Admin access required');
    const result = await WeeklyRaffleService.draw(req.params.id, req.user.id, _io);
    res.json({ success: true, ...result });
  });

  // Public
  static getCurrent = asyncHandler(async (_req, res) => {
    const raffle = await WeeklyRaffleService.getCurrent();
    res.json({ success: true, raffle });
  });

  // Count-only — unlike getEligiblePreview (admin), never exposes other users' names/wager amounts.
  static getEligibleCount = asyncHandler(async (req, res) => {
    const participants = await WeeklyRaffleService.getEligibleParticipants(req.params.id);
    res.json({ success: true, count: participants.length });
  });

  static getById = asyncHandler(async (req, res) => {
    const raffle = await WeeklyRaffleService.getById(req.params.id);
    res.json({ success: true, raffle });
  });

  static getMyEligibility = asyncHandler(async (req, res) => {
    if (!req.user) throw createError.unauthorized('Login required');
    const eligibility = await WeeklyRaffleService.getUserEligibility(req.params.id, req.user.id);
    res.json({ success: true, eligibility });
  });
}
