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
import { BingoStatus, TournamentStatus } from '@prisma/client';

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

    // Check for bingo join command: !join
    if (content.trim().toLowerCase() === '!join') {
      await this.processBingoJoin(kickUsername);
    }

    // Check for slot selection command: !slot <name>
    const slotMatch = content.match(/^!slot\s+(.+)/i);
    if (slotMatch) {
      await this.processBingoSlot(kickUsername, slotMatch[1].trim());
      await this.processKothSlot(kickUsername, slotMatch[1].trim());
    }

    // Check for King of the Hill join command: !king
    if (content.trim().toLowerCase() === '!king') {
      await this.processKothJoin(kickUsername);
    }

    // Check for tournament join command: !jointourney
    if (content.trim().toLowerCase() === '!jointourney') {
      await this.processTournamentJoin(kickUsername);
    }

    // Check for slot request command: !sr <slot name>
    const srMatch = content.match(/^!sr\s+(.+)/i);
    if (srMatch) {
      await SlotRequestService.handleChatRequest(kickUsername, srMatch[1].trim(), this.io ?? undefined);
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

    // Admin-only: !addcoins <kickname> <amount> / !removecoins <kickname> <amount>
    const coinsMatch = content.match(/^!(addcoins|removecoins)\s+(\S+)\s+(-?\d+)\b/i);
    if (coinsMatch) {
      const isRemove = coinsMatch[1].toLowerCase() === 'removecoins';
      const rawAmount = parseInt(coinsMatch[3], 10);
      const amount = isRemove ? -Math.abs(rawAmount) : rawAmount;
      await this.processAddCoins(kickUsername, coinsMatch[2], amount);
    }

    // Check for viewer picker keyword
    await ViewerPickerService.handleKeyword(kickUsername, content, this.io ?? undefined);

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
  // site. A matching site account (if any) is linked as an optional bonus.
  private static async processBingoJoin(kickUsername: string): Promise<void> {
    const normalized = kickUsername.trim().toLowerCase();

    // Find the bingo game open for registration or already active
    const game = await prisma.bonusBingo.findFirst({
      where: { status: { in: [BingoStatus.REGISTRATION, BingoStatus.ACTIVE] } },
    });
    if (!game) return;

    // Check not already joined
    const existing = await prisma.bingoParticipant.findUnique({
      where: { gameId_kickUsername: { gameId: game.id, kickUsername: normalized } },
    });
    if (existing) return;

    const user = await prisma.user.findFirst({
      where: { kickUsername: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });

    try {
      await BingoBoardService.join(game.id, { userId: user?.id, kickUsername: normalized }, this.io ?? undefined);
      logger.info(`KickChatService: ${kickUsername} joined bingo ${game.id} via !join${user ? '' : ' (unlinked)'}`);
      await this.sendChatMessage(`${kickUsername} has joined Bonus Bingo! 🎉`);
    } catch (err) {
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

  private static async processKothJoin(kickUsername: string): Promise<void> {
    try {
      const joined = await KingOfTheHillService.joinByKeyword(kickUsername, this.io ?? undefined);
      if (joined) {
        logger.info(`KickChatService: ${kickUsername} joined King of the Hill via !king`);
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

  // Admin-only: !addcoins <kickname> <amount> / !removecoins <kickname> <amount>. The
  // sender is authorized by resolving their own Kick username to a verified, isAdmin
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
