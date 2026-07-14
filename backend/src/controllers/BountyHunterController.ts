import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { BountyHunterService } from '@/services/BountyHunterService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setBountyHunterIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class BountyHunterController {
  static getAll = asyncHandler(async (_req, res) => {
    const hunts = await BountyHunterService.getAll();
    res.json({ success: true, hunts });
  });

  static getActive = asyncHandler(async (_req, res) => {
    const hunt = await BountyHunterService.getActivePublic();
    res.json({ success: true, hunt });
  });

  static getActiveAdmin = asyncHandler(async (_req, res) => {
    const hunt = await BountyHunterService.getActive();
    res.json({ success: true, hunt });
  });

  static create = asyncHandler(async (req, res) => {
    const { keyword, targetMin, targetMax, claimZone, pot } = req.body;
    if (!keyword?.trim()) { res.status(400).json({ error: 'keyword is required' }); return; }
    const hunt = await BountyHunterService.create(
      keyword,
      Number(targetMin) || 50,
      Number(targetMax) || 500,
      Number(claimZone) || 25,
      Number(pot) || 5000,
      req.user!.id,
      _io
    );
    res.status(201).json({ success: true, hunt });
  });

  static setRegistrationOpen = asyncHandler(async (req, res) => {
    const { open } = req.body;
    const hunt = await BountyHunterService.setRegistrationOpen(req.params.id, !!open, _io);
    res.json({ success: true, hunt });
  });

  static addEntry = asyncHandler(async (req, res) => {
    const { kickUsername } = req.body;
    if (!kickUsername?.trim()) { res.status(400).json({ error: 'kickUsername is required' }); return; }
    const hunt = await BountyHunterService.addEntryByUsername(req.params.id, kickUsername, _io);
    res.json({ success: true, hunt });
  });

  static removeEntry = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.removeEntry(req.params.entryId, _io);
    res.json({ success: true, hunt });
  });

  static draw = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.draw(req.params.id, _io);
    res.json({ success: true, hunt });
  });

  static setSlot = asyncHandler(async (req, res) => {
    const { slotName } = req.body;
    if (!slotName?.trim()) { res.status(400).json({ error: 'slotName is required' }); return; }
    const hunt = await BountyHunterService.setSlotByAdmin(req.params.entryId, slotName, _io);
    res.json({ success: true, hunt });
  });

  static skipPlayer = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.skipPlayer(req.params.entryId, _io);
    res.json({ success: true, hunt });
  });

  static submitRound = asyncHandler(async (req, res) => {
    const { betAmount, payoutAmount } = req.body;
    const result = await BountyHunterService.submitRound(req.params.entryId, Number(betAmount), Number(payoutAmount), _io);
    res.json({ success: true, ...result });
  });

  static settleBounty = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.settleBounty(req.params.id, _io);
    res.json({ success: true, hunt });
  });

  static forceRollover = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.forceRollover(req.params.id, _io);
    res.json({ success: true, hunt });
  });

  static rerollTarget = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.rerollTarget(req.params.id, _io);
    res.json({ success: true, hunt });
  });

  static setTarget = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.setTarget(req.params.id, Number(req.body.target), _io);
    res.json({ success: true, hunt });
  });

  static setClaimZone = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.setClaimZone(req.params.id, Number(req.body.claimZone), _io);
    res.json({ success: true, hunt });
  });

  static setPot = asyncHandler(async (req, res) => {
    const hunt = await BountyHunterService.setPot(req.params.id, Number(req.body.pot), _io);
    res.json({ success: true, hunt });
  });

  static deleteHunt = asyncHandler(async (req, res) => {
    await BountyHunterService.delete(req.params.id);
    res.json({ success: true });
  });
}
