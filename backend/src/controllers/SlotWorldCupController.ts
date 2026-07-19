import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { SlotWorldCupService } from '@/services/SlotWorldCupService';
import { SlotWorldCupSeeding } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/config/database';

let _io: SocketIOServer | undefined;
export const setSlotWorldCupIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class SlotWorldCupController {
  static getAll = asyncHandler(async (_req, res) => {
    res.json({ success: true, tournaments: await SlotWorldCupService.getAll() });
  });

  static getById = asyncHandler(async (req, res) => {
    res.json({ success: true, tournament: await SlotWorldCupService.getById(req.params.id) });
  });

  static getNominations = asyncHandler(async (req, res) => {
    res.json({ success: true, nominations: await SlotWorldCupService.getNominationRankings(req.params.id) });
  });

  static getLeaderboard = asyncHandler(async (req, res) => {
    res.json({ success: true, leaderboard: await SlotWorldCupService.getLeaderboard(req.params.id) });
  });

  static getMyPrediction = asyncHandler(async (req, res) => {
    res.json({ success: true, prediction: await SlotWorldCupService.getMyPrediction(req.params.id, req.user!.id) });
  });

  // Web nominations reuse the caller's own verified Kick identity server-side —
  // never a client-supplied username — so this can't be used to ballot-stuff
  // under someone else's name the way a naive body.kickUsername would allow.
  static nominate = asyncHandler(async (req, res) => {
    const { slotName } = req.body;
    if (!slotName?.trim()) {
      res.status(400).json({ error: 'slotName is required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { kickUsername: true, kickVerified: true } });
    if (!user?.kickVerified || !user.kickUsername) {
      res.status(403).json({ error: 'Verify your Kick account to nominate a slot' });
      return;
    }
    const nominations = await SlotWorldCupService.nominate(req.params.id, user.kickUsername, slotName);
    res.json({ success: true, nominations });
  });

  static submitPrediction = asyncHandler(async (req, res) => {
    const { picks } = req.body;
    if (!picks || typeof picks !== 'object') {
      res.status(400).json({ error: 'picks is required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { displayName: true, kickUsername: true } });
    const displayName = user?.kickUsername || user?.displayName || 'Player';
    const prediction = await SlotWorldCupService.submitPrediction(req.params.id, req.user!.id, displayName, picks);
    res.json({ success: true, prediction });
  });

  // ─── Admin ────────────────────────────────────────────────────────────────

  static create = asyncHandler(async (req, res) => {
    const { title, size, nominationCommand, scoringConfig, rewardConfig } = req.body;
    if (!title?.trim() || !size) {
      res.status(400).json({ error: 'title and size are required' });
      return;
    }
    const tournament = await SlotWorldCupService.create(title, Number(size), req.user!.id, nominationCommand, scoringConfig, rewardConfig);
    res.status(201).json({ success: true, tournament });
  });

  static lockNominations = asyncHandler(async (req, res) => {
    res.json({ success: true, tournament: await SlotWorldCupService.lockNominations(req.params.id) });
  });

  static addSlot = asyncHandler(async (req, res) => {
    const { slotName, provider, imageUrl } = req.body;
    if (!slotName?.trim()) { res.status(400).json({ error: 'slotName is required' }); return; }
    res.json({ success: true, slot: await SlotWorldCupService.addSlotManually(req.params.id, slotName, provider, imageUrl) });
  });

  static removeSlot = asyncHandler(async (req, res) => {
    await SlotWorldCupService.removeSlot(req.params.id, req.params.slotId);
    res.json({ success: true });
  });

  static finalizeParticipants = asyncHandler(async (req, res) => {
    const { mode, slotNames } = req.body;
    if (mode !== 'auto' && mode !== 'manual') { res.status(400).json({ error: 'mode must be "auto" or "manual"' }); return; }
    const tournament = await SlotWorldCupService.finalizeParticipants(req.params.id, { mode, slotNames });
    res.json({ success: true, tournament });
  });

  static generateBracket = asyncHandler(async (req, res) => {
    const { seeding } = req.body;
    const method = seeding === 'POPULARITY' ? SlotWorldCupSeeding.POPULARITY : SlotWorldCupSeeding.RANDOM;
    const tournament = await SlotWorldCupService.generateBracket(req.params.id, method, _io);
    res.json({ success: true, tournament });
  });

  static openPredictions = asyncHandler(async (req, res) => {
    res.json({ success: true, tournament: await SlotWorldCupService.openPredictions(req.params.id) });
  });

  static submitMatchResult = asyncHandler(async (req, res) => {
    const { betA, payoutA, betB, payoutB } = req.body;
    if ([betA, payoutA, betB, payoutB].some((v) => v === undefined || v === null || isNaN(Number(v)))) {
      res.status(400).json({ error: 'betA, payoutA, betB, and payoutB are required numbers' });
      return;
    }
    const tournament = await SlotWorldCupService.submitMatchResult(
      req.params.matchId, Number(betA), Number(payoutA), Number(betB), Number(payoutB), _io
    );
    res.json({ success: true, tournament });
  });

  static cancel = asyncHandler(async (req, res) => {
    res.json({ success: true, tournament: await SlotWorldCupService.cancel(req.params.id) });
  });

  static updateConfig = asyncHandler(async (req, res) => {
    const { scoringConfig, rewardConfig } = req.body;
    res.json({ success: true, tournament: await SlotWorldCupService.updateConfig(req.params.id, scoringConfig, rewardConfig) });
  });
}
