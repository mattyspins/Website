import WebSocket from 'ws';
import { RedisService } from '@/config/redis';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { PointsService } from '@/services/PointsService';

const KICK_CHANNEL_NAME = process.env['KICK_CHANNEL_NAME'] || 'mattyspins';
// Set KICK_CHATROOM_ID in .env — find it by opening kick.com/mattyspins and checking the chatroom ID in network tab
const KICK_CHATROOM_ID = parseInt(process.env['KICK_CHATROOM_ID'] || '0', 10);
const PUSHER_APP_KEY = '32cbd69e4b950bf97679';
const PUSHER_WS_URL = `wss://ws-us2.pusher.com/app/${PUSHER_APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
const CHAT_POINTS_AMOUNT = 1;
const CHAT_POINTS_COOLDOWN_SECONDS = 120; // 1 point per 2 minutes per user
const RECONNECT_DELAY_MS = 10_000;

export class KickChatService {
  private static ws: WebSocket | null = null;
  private static chatroomId: number | null = null;
  private static reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static pingTimer: ReturnType<typeof setInterval> | null = null;
  private static running = false;

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

    // Award points for chatting (verified users only)
    await this.awardChatPoints(kickUsername);
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
