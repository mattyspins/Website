import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { TournamentService } from '@/services/TournamentService';
import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedRequest } from '@/middleware/auth';

let _io: SocketIOServer | undefined;
export const setTournamentIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const createSchema = z.object({
  title: z.string().min(1).max(100),
  maxPlayers: z.number().int().min(2).max(64).default(8),
  slotTimerSeconds: z.number().int().min(60).max(600).default(180),
});

const drawSchema = z.object({ count: z.number().int().min(2).max(64) });
const slotSchema = z.object({ slotCall: z.string().min(1).max(100) });
const winnerSchema = z.object({ winnerId: z.string().min(1) });

export class TournamentController {
  // ─── Admin ────────────────────────────────────────────────────────────────

  static create = asyncHandler(async (req, res) => {
    const dto = createSchema.parse(req.body);
    const result = await TournamentService.create(dto, req.user!.id);
    res.status(201).json({ success: true, tournament: result });
  });

  static openRegistration = asyncHandler(async (req, res) => {
    const result = await TournamentService.openRegistration(req.params.id);
    res.json({ success: true, tournament: result });
  });

  static drawWinners = asyncHandler(async (req, res) => {
    const { count } = drawSchema.parse(req.body);
    const result = await TournamentService.drawWinners(req.params.id, count, _io);
    res.json({ success: true, tournament: result });
  });

  static rerollParticipant = asyncHandler(async (req, res) => {
    const result = await TournamentService.rerollParticipant(req.params.id, req.params.participantId, _io);
    res.json({ success: true, tournament: result });
  });

  static startTournament = asyncHandler(async (req, res) => {
    const result = await TournamentService.startTournament(req.params.id, _io);
    res.json({ success: true, tournament: result });
  });

  static declareMatchWinner = asyncHandler(async (req, res) => {
    const { winnerId } = winnerSchema.parse(req.body);
    const result = await TournamentService.declareMatchWinner(req.params.matchId, winnerId, _io);
    res.json({ success: true, tournament: result });
  });

  static revertMatchWinner = asyncHandler(async (req, res) => {
    const result = await TournamentService.revertMatchWinner(req.params.matchId, _io);
    res.json({ success: true, tournament: result });
  });

  static cancel = asyncHandler(async (req, res) => {
    const result = await TournamentService.cancel(req.params.id, _io);
    res.json({ success: true, tournament: result });
  });

  static deleteTournament = asyncHandler(async (req, res) => {
    await TournamentService.deleteTournament(req.params.id);
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
    const result = await TournamentService.enterRaffle(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  });

  static leaveRaffle = asyncHandler(async (req, res) => {
    const result = await TournamentService.leaveRaffle(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  });

  static setInitialSlot = asyncHandler(async (req, res) => {
    const { slotCall } = slotSchema.parse(req.body);
    const result = await TournamentService.setInitialSlot(req.params.id, req.user!.id, slotCall, _io);
    res.json({ success: true, tournament: result });
  });

  static setMatchSlot = asyncHandler(async (req, res) => {
    const { slotCall } = slotSchema.parse(req.body);
    const result = await TournamentService.setMatchSlot(req.params.matchId, req.user!.id, slotCall, _io);
    res.json({ success: true, match: result });
  });

  static confirmMatchSlot = asyncHandler(async (req, res) => {
    const result = await TournamentService.confirmMatchSlot(req.params.matchId, req.user!.id, _io);
    res.json({ success: true, match: result });
  });

  static getMyEntry = asyncHandler(async (req, res) => {
    const result = await TournamentService.getMyEntry(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  });
}
