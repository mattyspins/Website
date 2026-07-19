import WebSocket from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { RedisService } from '@/config/redis';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { PointsService } from '@/services/PointsService';
import { AdminService } from '@/services/AdminService';
import { BingoBoardService } from '@/services/BingoBoardService';
import { ViewerPickerService } from '@/services/ViewerPickerService';
import { SlotRequestService } from '@/services/SlotRequestService';
import { GuessTheBalanceService } from '@/services/GuessTheBalanceService';
import { KingOfTheHillService } from '@/services/KingOfTheHillService';
import { TournamentService } from '@/services/TournamentService';
import { HighRollerService } from '@/services/HighRollerService';
import { BossRaidService } from '@/services/BossRaidService';
import { BountyHunterService } from '@/services/BountyHunterService';
import { SlotWorldCupService } from '@/services/SlotWorldCupService';
import { BingoStatus, TournamentStatus, HighRollerPrediction, HighRollerStatus, SlotWorldCupStatus } from '@prisma/client';

const KICK_CHANNEL_NAME = process.env['KICK_CHANNEL_NAME'] || 'mattyspins';
// Set KICK_CHATROOM_ID in .env — find it by opening kick.com/mattyspins and checking the chatroom ID in network tab
const KICK_CHATROOM_ID = parseInt(process.env['KICK_CHATROOM_ID'] || '0', 10);
// Bot token for sending chat messages — set KICK_BOT_TOKEN in Railway env vars
// Get it by going to kick.com → your account settings → App Access Tokens (or use OAuth with chat:write scope)
const KICK_BOT_TOKEN = process.env['KICK_BOT_TOKEN'] || '';
const PUSHER_APP_KEY = '32cbd69e4b950bf97679';
const PUSHER_WS_URL = `wss://ws-us2.pusher.com/app/${PUSHER_APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
const CHAT_POINTS_AMOUNT = 1;
const CHAT_POINTS_COOLDOWN_SECONDS = 300; // 1 point per 5 minutes per user
const RECONNECT_DELAY_MS = 10_000;

export class KickChatService {
  private static ws: WebSocket | null = null;
  private static chatroomId: number | null = null;
  private static reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static pingTimer: ReturnType<typeof setInterval> | null = null;
  private static running = false;
  private static io: SocketIOServer | null = null;

  static setIO(io: SocketIOServer): void {
    this.io = io;
  }

  static async start(): Promise<void> {
    if (!KICK_CHATROOM_ID) {
      logger.warn('KickChatService: KICK_CHATROOM_ID not set in .env — chat listener disabled');
      return;
    }
    this.running = true;
    this.chatroomId = KICK_CHATROOM_ID;
    await this.connect();
  }

  static stop(): void {
    this.running = false;
    this.clearTimers();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  private static clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private static async connect(): Promise<void> {
    try {

      this.ws = new WebSocket(PUSHER_WS_URL, {
        headers: {
          'Origin': 'https://kick.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      this.ws.on('open', () => {
        logger.info('KickChatService: WebSocket open, waiting for Pusher handshake');
        // Keep-alive ping every 30 s
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
          }
        }, 30_000);
      });

      this.ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          // Subscribe only after Pusher confirms the connection
          if (msg.event === 'pusher:connection_established') {
            logger.info('KickChatService: Pusher connected, subscribing to chatroom');
            this.ws!.send(
              JSON.stringify({
                event: 'pusher:subscribe',
                data: { auth: '', channel: `chatrooms.${this.chatroomId}.v2` },
              })
            );
            return;
          }

          if (msg.event === 'pusher_internal:subscription_succeeded') {
            logger.info(`KickChatService: subscribed to chatrooms.${this.chatroomId}.v2`);
            return;
          }

          if (msg.event === 'App\\Events\\ChatMessageEvent') {
            const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
            await this.handleMessage(data).catch((e) =>
              logger.error('KickChatService: handleMessage error', { error: (e as Error).message })
            );
          }
        } catch {
          // ignore malformed frames
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.warn('KickChatService: connection closed', { code, reason: reason.toString() });
        this.clearTimers();
        if (this.running) {
          this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
        }
      });

      this.ws.on('error', (err) => {
        logger.error('KickChatService: WebSocket error', { error: err.message });
      });
    } catch (err) {
      logger.error('KickChatService: connect() failed', { error: (err as Error).message });
      if (this.running) {
        this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS * 3);
      }
    }
  }

  private static async handleMessage(data: any): Promise<void> {
    const kickUsername: string = data?.sender?.username;
    const content: string = data?.content;
    if (!kickUsername || !content) return;

    // Check for verification command: !verify XXXXXX
    const match = content.match(/!verify\s+([A-Z0-9]{6,10})/i);
    if (match) {
      await this.processVerification(kickUsername, match[1].toUpperCase());
    }

    // Check for bingo join command: !join (optionally "!join <slot name>" as a default
    // slot pre-filled whenever this viewer is next drawn — still overridable per cell)
    const joinMatch = content.match(/^!join(?:\s+(.+))?$/i);
    if (joinMatch) {
      await this.processBingoJoin(kickUsername, joinMatch[1]?.trim() || null);
    }

    // Check for slot selection command: !slot <name>
    const slotMatch = content.match(/^!slot\s+(.+)/i);
    if (slotMatch) {
      const slotName = slotMatch[1].trim();
      await this.processBingoSlot(kickUsername, slotName);
      await this.processKothSlot(kickUsername, slotName);
      const bossSlotSet = await BossRaidService.submitSlotCall(kickUsername, slotName, this.io ?? undefined);
      if (bossSlotSet) await this.sendChatMessage(`🎰 ${kickUsername} locked in "${slotName}" for the Boss Raid!`);
      const bountySlotSet = await BountyHunterService.submitSlotCall(kickUsername, slotName, this.io ?? undefined);
      if (bountySlotSet) await this.sendChatMessage(`🎯 ${kickUsername} locked in "${slotName}" for the Bounty Hunter!`);
    }

    // Check for King of the Hill join command: !king (optionally "!king <slot name>",
    // locking in a slot at signup the same way Bounty Hunter's "!bounty <slot>" does)
    const kingMatch = content.match(/^!king(?:\s+(.+))?$/i);
    if (kingMatch) {
      await this.processKothJoin(kickUsername, kingMatch[1]?.trim() || null);
    }

    // High Roller: commands are admin-configurable per session (unlike the hardcoded ones
    // above), so fetch the active session once and compare against its own keyword fields.
    await this.processHighRollerCommand(kickUsername, content);

    // Check for tournament join command: !jointourney
    if (content.trim().toLowerCase() === '!jointourney') {
      await this.processTournamentJoin(kickUsername);
    }

    // Check for Slot World Cup nomination command: !wc <slot name>
    const wcMatch = content.match(/^!wc\s+(.+)/i);
    if (wcMatch) {
      await this.processSlotWorldCupNomination(kickUsername, wcMatch[1].trim());
    }

    // Check for slot request command: !sr <slot name>
    const srMatch = content.match(/^!sr\s+(.+)/i);
    if (srMatch) {
      const srSlotName = srMatch[1].trim();
      await SlotRequestService.handleChatRequest(kickUsername, srSlotName, this.io ?? undefined);
      const suggested = await HighRollerService.submitSuggestedSlot(kickUsername, srSlotName, this.io ?? undefined);
      if (suggested) await this.sendChatMessage(`🎰 ${kickUsername} called "${srSlotName}" as the next slot!`);
    }

    // Check for GTB guess command: !guess <amount>
    const guessMatch = content.match(/^!guess\s+([\d.,]+)/i);
    if (guessMatch) {
      const amount = parseFloat(guessMatch[1].replace(/,/g, ''));
      const result = await GuessTheBalanceService.submitGuessByKickUsername(kickUsername, amount);
      if (result === 'ok') {
        await this.sendChatMessage(`✅ @${kickUsername} your guess of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been recorded!`);
      } else if (result === 'not_verified') {
        await this.sendChatMessage(`@${kickUsername} you need to verify your Kick account on the website first to participate!`);
      } else if (result === 'no_game') {
        await this.sendChatMessage(`@${kickUsername} there is no active Guess the Balance game right now.`);
      } else if (result === 'invalid') {
        await this.sendChatMessage(`@${kickUsername} invalid amount. Use !guess <amount> e.g. !guess 1500`);
      }
    }

    // Admin-only: !addcoins/!addpoints <kickname> <amount> / !removecoins/!removepoints <kickname> <amount>.
    // The target accepts an optional leading "@" since that's how people naturally type mentions in chat.
    const coinsMatch = content.match(/^!(addcoins|removecoins|addpoints|removepoints)\s+@?(\S+)\s+(-?\d+)\b/i);
    if (coinsMatch) {
      const isRemove = /^remove/i.test(coinsMatch[1]);
      const rawAmount = parseInt(coinsMatch[3], 10);
      const amount = isRemove ? -Math.abs(rawAmount) : rawAmount;
      await this.processAddCoins(kickUsername, coinsMatch[2], amount);
    }

    // Check for viewer picker keyword
    const enteredPicker = await ViewerPickerService.handleKeyword(kickUsername, content, this.io ?? undefined);
    if (enteredPicker) await this.sendChatMessage(`🎯 ${kickUsername} has entered the Viewer Picker!`);

    // Check for Boss Raid entry keyword (e.g. "!monster")
    const joinedRaid = await BossRaidService.handleKeyword(kickUsername, content, this.io ?? undefined);
    if (joinedRaid) await this.sendChatMessage(`⚔️ ${kickUsername} has joined the Boss Raid!`);

    // Check for Bounty Hunter entry keyword (e.g. "!bounty" or "!bounty sweetbonanza")
    const joinedBounty = await BountyHunterService.handleKeyword(kickUsername, content, this.io ?? undefined);
    if (joinedBounty) await this.sendChatMessage(`🎯 ${kickUsername} has joined the Bounty Hunter!`);

    // Award points for chatting (verified users only)
    await this.awardChatPoints(kickUsername);
  }

  static async sendChatMessage(message: string): Promise<void> {
    if (!KICK_BOT_TOKEN || !KICK_CHATROOM_ID) return;
    try {
      const res = await fetch(`https://kick.com/api/v2/messages/send/${KICK_CHATROOM_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KICK_BOT_TOKEN}`,
          'User-Agent': 'MattySpinsBot/1.0',
        },
        body: JSON.stringify({ content: message, type: 'message' }),
      });
      if (!res.ok) {
        logger.warn(`KickChatService: sendChatMessage failed (${res.status})`);
      }
    } catch (err) {
      logger.warn('KickChatService: sendChatMessage error', { error: (err as Error).message });
    }
  }

  // Called on "!join" — the chatter is identified by their Kick username directly from
  // the chat event, so joining never depends on having linked Kick or registered on the
  // site. A matching site account (if any) is linked as an optional bonus. A repeat
  // "!join <slot>" from someone already in the pool updates their default slot for
  // future draws (BingoBoardService.join handles that — including refusing it if
  // they're mid-turn right now, since "!slot" is the right command for that).
  private static async processBingoJoin(kickUsername: string, preferredSlot: string | null): Promise<void> {
    const normalized = kickUsername.trim().toLowerCase();

    // Find the bingo game open for registration or already active
    const game = await prisma.bonusBingo.findFirst({
      where: { status: { in: [BingoStatus.REGISTRATION, BingoStatus.ACTIVE] } },
    });
    if (!game) return;

    const existing = await prisma.bingoParticipant.findUnique({
      where: { gameId_kickUsername: { gameId: game.id, kickUsername: normalized } },
    });

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    try {
      await BingoBoardService.join(game.id, { userId: user?.id, kickUsername: normalized }, preferredSlot, this.io ?? undefined);
      if (existing) {
        logger.info(`KickChatService: ${kickUsername} updated their bingo preferred slot to "${preferredSlot}"`);
        await this.sendChatMessage(`🎰 ${kickUsername} updated their default slot to "${preferredSlot}"!`);
      } else {
        logger.info(`KickChatService: ${kickUsername} joined bingo ${game.id} via !join${preferredSlot ? ` (preferred slot: ${preferredSlot})` : ''}${user ? '' : ' (unlinked)'}`);
        await this.sendChatMessage(`${kickUsername} has joined Bonus Bingo! 🎉`);
      }
    } catch (err) {
      // Expected/benign failures (not registered yet, bare repeat "!join" with nothing
      // to update, or mid-turn) just get logged — no chat spam for those.
      logger.warn(`KickChatService: !join failed for ${kickUsername}`, { error: (err as Error).message });
    }
  }

  private static async processBingoSlot(kickUsername: string, slotName: string): Promise<void> {
    const normalized = kickUsername.trim().toLowerCase();

    // Find an active bingo game where this kick username is the currently selected player
    const game = await prisma.bonusBingo.findFirst({
      where: { status: BingoStatus.ACTIVE, currentKickUsername: normalized },
      include: { cells: true },
    });
    if (!game || !game.currentCellId) return;

    // Only set if no slot chosen yet
    const activeCell = game.cells.find(c => c.id === game.currentCellId);
    if (!activeCell || activeCell.slotName) return;

    try {
      await BingoBoardService.setSlot(game.id, game.currentCellId, slotName, { kickUsername: normalized }, false, this.io ?? undefined);
      logger.info(`KickChatService: ${kickUsername} set slot "${slotName}" via !slot`);
      await this.sendChatMessage(`${kickUsername} has picked "${slotName}" as their slot! 🎰`);
    } catch (err) {
      logger.warn(`KickChatService: !slot failed for ${kickUsername}`, { error: (err as Error).message });
    }
  }

  private static async processKothJoin(kickUsername: string, slotName: string | null): Promise<void> {
    try {
      const joined = await KingOfTheHillService.joinByKeyword(kickUsername, slotName, this.io ?? undefined);
      if (joined) {
        logger.info(`KickChatService: ${kickUsername} joined King of the Hill via !king${slotName ? ` (slot: ${slotName})` : ''}`);
        await this.sendChatMessage(`👑 ${kickUsername} has joined King of the Hill!`);
      }
    } catch (err) {
      logger.warn(`KickChatService: !king failed for ${kickUsername}`, { error: (err as Error).message });
    }
  }

  private static async processTournamentJoin(kickUsername: string): Promise<void> {
    // Find the verified user by Kick username
    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername, mode: 'insensitive' }, kickVerified: true },
      select: { id: true },
    });
    if (!user) {
      await this.sendChatMessage(`@${kickUsername} you need to verify your Kick account on the website first to join the tournament!`);
      return;
    }

    const tournament = await prisma.tournament.findFirst({
      where: { status: TournamentStatus.REGISTRATION },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!tournament) {
      await this.sendChatMessage(`@${kickUsername} there's no tournament registration open right now.`);
      return;
    }

    try {
      await TournamentService.enterRaffle(tournament.id, user.id, this.io ?? undefined);
      logger.info(`KickChatService: ${kickUsername} joined tournament ${tournament.id} via !jointourney`);
      await this.sendChatMessage(`🏆 @${kickUsername} has entered the tournament draw!`);
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'Already entered') {
        await this.sendChatMessage(`@${kickUsername} you're already entered in the tournament!`);
      } else {
        logger.warn(`KickChatService: !jointourney failed for ${kickUsername}`, { error: message });
      }
    }
  }

  // Admin-only: !addcoins/!addpoints <kickname> <amount> / !removecoins/!removepoints <kickname> <amount>.
  // The sender is authorized by resolving their own Kick username to a verified, isAdmin
  // site account — the same identity trust already used elsewhere in this file — so a
  // non-admin typing this command is silently ignored rather than told the command exists.
  private static async processAddCoins(senderKickUsername: string, targetKickUsername: string, amount: number): Promise<void> {
    const admin = await prisma.user.findFirst({
      where: { kickUsername: { equals: senderKickUsername, mode: 'insensitive' }, kickVerified: true, isAdmin: true },
      select: { id: true },
    });
    if (!admin) return;

    if (!Number.isFinite(amount) || amount === 0) {
      await this.sendChatMessage(`@${senderKickUsername} usage: !addcoins <kickname> <amount> (or !removecoins <kickname> <amount>)`);
      return;
    }

    const target = await prisma.user.findFirst({
      where: { kickUsername: { equals: targetKickUsername, mode: 'insensitive' } },
      select: { id: true, kickUsername: true, displayName: true },
    });
    if (!target) {
      await this.sendChatMessage(`@${senderKickUsername} no linked user found with Kick username "${targetKickUsername}"`);
      return;
    }

    try {
      await AdminService.adjustUserPoints(target.id, amount, `Kick chat command by ${senderKickUsername}`, admin.id);
      const targetName = target.kickUsername ?? target.displayName;
      const verb = amount > 0 ? 'Added' : 'Removed';
      const prep = amount > 0 ? 'to' : 'from';
      await this.sendChatMessage(`✅ ${verb} ${Math.abs(amount)} coins ${prep} ${targetName}`);
      logger.info(`KickChatService: ${senderKickUsername} adjusted ${amount} coins for ${targetKickUsername} via chat command`);
    } catch (err) {
      await this.sendChatMessage(`@${senderKickUsername} failed: ${(err as Error).message}`);
      logger.warn(`KickChatService: !addcoins failed for ${targetKickUsername}`, { error: (err as Error).message });
    }
  }

  // Slot World Cup nomination: !wc <slot name> — one nomination per viewer,
  // resubmitting replaces the previous one (SlotWorldCupService.nominate upserts).
  private static async processSlotWorldCupNomination(kickUsername: string, slotName: string): Promise<void> {
    try {
      const tournament = await prisma.slotWorldCup.findFirst({
        where: { status: SlotWorldCupStatus.NOMINATION, nominationsOpen: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!tournament) return;

      await SlotWorldCupService.nominate(tournament.id, kickUsername, slotName);
      logger.info(`KickChatService: ${kickUsername} nominated "${slotName}" for Slot World Cup via !wc`);
      this.io?.to(`slotWorldCup:${tournament.id}`).emit('slotWorldCup:nominationsUpdated');
    } catch (err) {
      logger.warn(`KickChatService: !wc failed for ${kickUsername}`, { error: (err as Error).message });
    }
  }

  private static async processKothSlot(kickUsername: string, slotName: string): Promise<void> {
    try {
      const matched = await KingOfTheHillService.submitSlotCall(kickUsername, slotName, this.io ?? undefined);
      if (matched) {
        logger.info(`KickChatService: ${kickUsername} called slot "${slotName}" for King of the Hill`);
        await this.sendChatMessage(`🎰 ${kickUsername} called "${slotName}" for their King of the Hill climb!`);
      }
    } catch (err) {
      logger.warn(`KickChatService: koth !slot failed for ${kickUsername}`, { error: (err as Error).message });
    }
  }

  // High Roller's join/leave/over/under/suggest commands are admin-configurable per session
  // (the only other precedent for this in the codebase is ViewerPicker.keyword), so — unlike
  // every other game's hardcoded command check above — this looks up the active session first
  // and compares the message against its own keyword fields.
  private static async processHighRollerCommand(kickUsername: string, content: string): Promise<void> {
    try {
      const session = await prisma.highRoller.findFirst({ where: { status: HighRollerStatus.OPEN } });
      if (!session) return;

      const normalizedContent = content.trim().toLowerCase();
      const io = this.io ?? undefined;

      if (normalizedContent === session.joinKeyword.toLowerCase()) {
        const joined = await HighRollerService.joinByKeyword(kickUsername, io);
        if (joined) await this.sendChatMessage(`🎲 ${kickUsername} is in the game! Predict Over/Under ${Number(session.threshold)}x with ${session.overKeyword}/${session.underKeyword}`);
        return;
      }

      if (normalizedContent === session.leaveKeyword.toLowerCase()) {
        const left = await HighRollerService.leaveByKeyword(kickUsername, io);
        if (left) await this.sendChatMessage(`${kickUsername} has left High Roller.`);
        return;
      }

      if (normalizedContent === session.overKeyword.toLowerCase()) {
        const predicted = await HighRollerService.submitPrediction(kickUsername, HighRollerPrediction.OVER, io);
        if (predicted) await this.sendChatMessage(`📈 ${kickUsername} predicted OVER ${Number(session.threshold)}x!`);
        return;
      }

      if (normalizedContent === session.underKeyword.toLowerCase()) {
        const predicted = await HighRollerService.submitPrediction(kickUsername, HighRollerPrediction.UNDER, io);
        if (predicted) await this.sendChatMessage(`📉 ${kickUsername} predicted UNDER ${Number(session.threshold)}x!`);
        return;
      }

      if (session.suggestKeyword && normalizedContent === session.suggestKeyword.toLowerCase()) {
        const entered = await HighRollerService.suggestEntryByKeyword(kickUsername, io);
        if (entered) await this.sendChatMessage(`🎰 ${kickUsername} is in the running to suggest the next slot!`);
      }
    } catch (err) {
      logger.warn(`KickChatService: High Roller command failed for ${kickUsername}`, { error: (err as Error).message });
    }
  }

  static async processVerification(kickUsername: string, code: string): Promise<void> {
    const userId = await RedisService.get(`kick_verify_code:${code}`);
    if (!userId) return;

    const pendingRaw = await RedisService.get(`kick_verify:${userId}`);
    if (!pendingRaw) return;

    const pending = JSON.parse(pendingRaw);
    if (pending.kickUsername.toLowerCase() !== kickUsername.toLowerCase()) {
      logger.warn(`KickChatService: wrong username for code ${code}: got ${kickUsername}, expected ${pending.kickUsername}`);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { kickUsername: pending.kickUsername, kickVerified: true },
    });

    await RedisService.del(`kick_verify_code:${code}`);
    await RedisService.del(`kick_verify:${userId}`);
    // Invalidate cached session so next /api/auth/me returns updated kickVerified
    await RedisService.deleteSession(userId);
    // Signal for frontend polling (5-min TTL)
    await RedisService.set(`kick_verified_signal:${userId}`, pending.kickUsername, 300);

    await this.sendChatMessage(`✅ @${pending.kickUsername} your Kick account is now verified!`);
    logger.info(`KickChatService: verified ${pending.kickUsername} for user ${userId}`);
  }

  private static async awardChatPoints(kickUsername: string): Promise<void> {
    const cooldownKey = `chat_cooldown:${kickUsername.toLowerCase()}`;
    if (await RedisService.get(cooldownKey)) return;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: kickUsername, mode: 'insensitive' }, kickVerified: true },
      select: { id: true },
    });
    if (!user) return;

    await PointsService.addPoints({
      userId: user.id,
      amount: CHAT_POINTS_AMOUNT,
      reason: 'Active in Kick chat',
      referenceType: 'kick_chat',
    });

    await RedisService.set(cooldownKey, '1', CHAT_POINTS_COOLDOWN_SECONDS);
    // Track last activity for view-time logic
    await RedisService.set(`last_chat:${user.id}`, Date.now().toString(), 3600);
  }
}
