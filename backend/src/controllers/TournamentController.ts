import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { TournamentService } from '@/services/TournamentService';
import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedRequest } from '@/middleware/auth';
import { TournamentEntrySource } from '@/types/tournament';

let _io: SocketIOServer | undefined;
export const setTournamentIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const createSchema = z.object({
  title: z.string().min(1).max(100),
  maxPlayers: z.number().int().min(2).max(64).default(8),
  keyword: z.string().min(1).max(30).optional(),
});

const updateTournamentSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  keyword: z.string().min(1).max(30).optional(),
  maxPlayers: z.number().int().min(2).max(64).optional(),
  allowDuplicateSlots: z.boolean().optional(),
  betAmountPerSpin: z.number().min(0).nullable().optional(),
  prizePoolDisplay: z.string().max(100).nullable().optional(),
});

const enterSchema = z.object({ slot: z.string().min(1).max(100) });
const banSchema = z.object({ userId: z.string().min(1), reason: z.string().max(200).optional() });
const matchResultSchema = z.object({ participantId: z.string().min(1), resultText: z.string().max(50) });
const winnerSchema = z.object({ winnerId: z.string().min(1) });

export class TournamentController {
  // ─── Admin ────────────────────────────────────────────────────────────────

  static create = asyncHandler(async (req, res) => {
    const dto = createSchema.parse(req.body);
    const result = await TournamentService.create(dto, req.user!.id);
    res.status(201).json({ success: true, tournament: result });
  });

  static updateTournament = asyncHandler(async (req, res) => {
    const dto = updateTournamentSchema.parse(req.body);
    const result = await TournamentService.updateTournament(req.params.id, dto, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static openRegistration = asyncHandler(async (req, res) => {
    const result = await TournamentService.openRegistration(req.params.id, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static lockRegistration = asyncHandler(async (req, res) => {
    const result = await TournamentService.lockRegistration(req.params.id, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static getDrawStatus = asyncHandler(async (req, res) => {
    const result = await TournamentService.getDrawStatus(req.params.id);
    res.json({ success: true, draw: result });
  });

  static runDraw = asyncHandler(async (req, res) => {
    const result = await TournamentService.runDraw(req.params.id, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static getEntries = asyncHandler(async (req, res) => {
    const entries = await TournamentService.getEntries(req.params.id);
    res.json({ success: true, entries });
  });

  static invalidateEntry = asyncHandler(async (req, res) => {
    const result = await TournamentService.invalidateEntry(req.params.id, req.params.entryId, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static restoreEntry = asyncHandler(async (req, res) => {
    const result = await TournamentService.restoreEntry(req.params.id, req.params.entryId, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static banUser = asyncHandler(async (req, res) => {
    const { userId, reason } = banSchema.parse(req.body);
    const result = await TournamentService.banUser(req.params.id, userId, req.user!.id, reason, _io);
    res.json({ success: true, tournament: result });
  });

  static unbanUser = asyncHandler(async (req, res) => {
    const result = await TournamentService.unbanUser(req.params.id, req.params.userId, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static replaceParticipant = asyncHandler(async (req, res) => {
    const result = await TournamentService.replaceParticipantWithReserve(req.params.id, req.params.participantId, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static startTournament = asyncHandler(async (req, res) => {
    const result = await TournamentService.startTournament(req.params.id, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static setMatchResult = asyncHandler(async (req, res) => {
    const { participantId, resultText } = matchResultSchema.parse(req.body);
    const result = await TournamentService.setMatchResult(req.params.matchId, participantId, resultText, req.user!.id, _io);
    res.json({ success: true, match: result });
  });

  static declareMatchWinner = asyncHandler(async (req, res) => {
    const { winnerId } = winnerSchema.parse(req.body);
    const result = await TournamentService.declareMatchWinner(req.params.matchId, winnerId, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static revertMatchWinner = asyncHandler(async (req, res) => {
    const result = await TournamentService.revertMatchWinner(req.params.matchId, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static pauseMatch = asyncHandler(async (req, res) => {
    const result = await TournamentService.pauseMatch(req.params.matchId, req.user!.id, _io);
    res.json({ success: true, match: result });
  });

  static resumeMatch = asyncHandler(async (req, res) => {
    const result = await TournamentService.resumeMatch(req.params.matchId, req.user!.id, _io);
    res.json({ success: true, match: result });
  });

  static cancel = asyncHandler(async (req, res) => {
    const result = await TournamentService.cancel(req.params.id, req.user!.id, _io);
    res.json({ success: true, tournament: result });
  });

  static deleteTournament = asyncHandler(async (req, res) => {
    await TournamentService.deleteTournament(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Tournament deleted' });
  });

  // ─── Viewer ───────────────────────────────────────────────────────────────

  static getAll = asyncHandler(async (_req, res) => {
    const tournaments = await TournamentService.getAll();
    res.json({ success: true, tournaments });
  });

  static getById = asyncHandler(async (req, res) => {
    const tournament = await TournamentService.getById(req.params.id);
    res.json({ success: true, tournament });
  });

  static enterRaffle = asyncHandler(async (req, res) => {
    const { slot } = enterSchema.parse(req.body);
    const result = await TournamentService.enterRaffle(req.params.id, req.user!.id, slot, TournamentEntrySource.WEB, _io);
    res.json({ success: true, ...result });
  });

  static leaveRaffle = asyncHandler(async (req, res) => {
    const result = await TournamentService.leaveRaffle(req.params.id, req.user!.id, _io);
    res.json({ success: true, ...result });
  });

  static getMyEntry = asyncHandler(async (req, res) => {
    const result = await TournamentService.getMyEntry(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  });
}
