import { RedisService } from '@/config/redis';
import { logger } from '@/utils/logger';

const KICK_CHANNEL = 'mattyspinsslots';
const KICK_API = 'https://kick.com/api/v2';
// Points awarded per 10 minutes of watch time
const POINTS_PER_10_MIN = 1;

interface ViewingSession {
  userId: string;
  streamId: string;
  startTime: string;
  lastActivity: string;
  isActive: boolean;
}

export class KickService {
  // ─── Stream status ──────────────────────────────────────────────
  static async getMattySpinsStreamInfo(): Promise<any> {
    try {
      const res = await fetch(`${KICK_API}/channels/${KICK_CHANNEL}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MattySpinsBot/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      logger.warn('Kick API fetch failed:', err);
      return null;
    }
  }

  static async isMattySpinsLive(): Promise<boolean> {
    const info = await this.getMattySpinsStreamInfo();
    return !!(info?.livestream);
  }

  // ─── Session management (Redis-backed) ──────────────────────────
  private static sessionKey(userId: string, streamId: string) {
    return `viewing:${userId}:${streamId}`;
  }

  static async getActiveViewingSession(
    userId: string,
    streamId: string
  ): Promise<ViewingSession | null> {
    return RedisService.getJSON<ViewingSession>(
      this.sessionKey(userId, streamId)
    );
  }

  static async startViewingSession(
    userId: string,
    streamId: string
  ): Promise<ViewingSession> {
    const session: ViewingSession = {
      userId,
      streamId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true,
    };
    await RedisService.setJSON(this.sessionKey(userId, streamId), session, 7200);
    return session;
  }

  static async endViewingSession(
    userId: string,
    streamId: string
  ): Promise<{ durationMinutes: number; pointsEarned: number }> {
    const key = this.sessionKey(userId, streamId);
    const session = await RedisService.getJSON<ViewingSession>(key);

    if (!session) {
      return { durationMinutes: 0, pointsEarned: 0 };
    }

    const durationMs =
      Date.now() - new Date(session.startTime).getTime();
    const durationMinutes = Math.max(0, Math.floor(durationMs / 60000));
    const pointsEarned =
      Math.floor(durationMinutes / 10) * POINTS_PER_10_MIN;

    await RedisService.del(key);
    return { durationMinutes, pointsEarned };
  }

  static async validateUserPresence(
    userId: string,
    streamId: string
  ): Promise<boolean> {
    const session = await this.getActiveViewingSession(userId, streamId);
    return session !== null;
  }

  static async updateViewingActivity(
    userId: string,
    streamId: string
  ): Promise<ViewingSession | null> {
    const key = this.sessionKey(userId, streamId);
    const session = await RedisService.getJSON<ViewingSession>(key);
    if (!session) return null;
    session.lastActivity = new Date().toISOString();
    await RedisService.setJSON(key, session, 7200);
    return session;
  }
}
