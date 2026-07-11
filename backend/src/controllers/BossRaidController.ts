import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { BossRaidService } from '@/services/BossRaidService';
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | undefined;
export const setBossRaidIO = (io: SocketIOServer) => { _io = io; };

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

export class BossRaidController {
  static getRoster = asyncHandler(async (_req, res) => {
    res.json({ success: true, roster: BossRaidService.getRoster() });
  });

  static getAll = asyncHandler(async (_req, res) => {
    const raids = await BossRaidService.getAll();
    res.json({ success: true, raids });
  });

  static getActive = asyncHandler(async (_req, res) => {
    const raid = await BossRaidService.getActive();
    res.json({ success: true, raid });
  });

  static create = asyncHandler(async (req, res) => {
    const { bossKey, keyword, maxHp } = req.body;
    if (!bossKey || !keyword?.trim()) {
      res.status(400).json({ error: 'bossKey and keyword are required' });
      return;
    }
    const raid = await BossRaidService.create(bossKey, keyword, maxHp ? Number(maxHp) : undefined, req.user!.id, _io);
    res.status(201).json({ success: true, raid });
  });

  static closeRegistration = asyncHandler(async (req, res) => {
    const raid = await BossRaidService.closeRegistration(req.params.id, _io);
    res.json({ success: true, raid });
  });

  static addEntry = asyncHandler(async (req, res) => {
    const { kickUsername } = req.body;
    if (!kickUsername?.trim()) { res.status(400).json({ error: 'kickUsername is required' }); return; }
    const raid = await BossRaidService.addEntryByUsername(req.params.id, kickUsername, _io);
    res.json({ success: true, raid });
  });

  static removeEntry = asyncHandler(async (req, res) => {
    const raid = await BossRaidService.removeEntry(req.params.entryId, _io);
    res.json({ success: true, raid });
  });

  static draw = asyncHandler(async (req, res) => {
    const raid = await BossRaidService.draw(req.params.id, _io);
    res.json({ success: true, raid });
  });

  static setSlot = asyncHandler(async (req, res) => {
    const { slotName } = req.body;
    if (!slotName?.trim()) { res.status(400).json({ error: 'slotName is required' }); return; }
    const raid = await BossRaidService.setSlotByAdmin(req.params.entryId, slotName, _io);
    res.json({ success: true, raid });
  });

  static skipPlayer = asyncHandler(async (req, res) => {
    const raid = await BossRaidService.skipPlayer(req.params.entryId, _io);
    res.json({ success: true, raid });
  });

  static submitDeadBonus = asyncHandler(async (req, res) => {
    const result = await BossRaidService.submitDeadBonus(req.params.entryId, _io);
    res.json({ success: true, ...result });
  });

  static submitRound = asyncHandler(async (req, res) => {
    const { betAmount, payoutAmount, isRetrigger } = req.body;
    const result = await BossRaidService.submitRound(
      req.params.entryId,
      Number(betAmount),
      Number(payoutAmount),
      !!isRetrigger,
      _io
    );
    res.json({ success: true, ...result });
  });

  static endRaid = asyncHandler(async (req, res) => {
    const raid = await BossRaidService.endRaid(req.params.id, _io);
    res.json({ success: true, raid });
  });

  static deleteRaid = asyncHandler(async (req, res) => {
    await BossRaidService.delete(req.params.id);
    res.json({ success: true });
  });
}
