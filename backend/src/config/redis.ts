import Redis from 'ioredis';
import { logger } from '@/utils/logger';
import { validateEnv } from '@/config/env';

const env = validateEnv();

// Check if Redis is configured
const isRedisEnabled = env.REDIS_URL && env.REDIS_URL !== '';

// Redis connection configuration
const redisConfig = {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client only if enabled
export const redis = isRedisEnabled
  ? new Redis(env.REDIS_URL, redisConfig)
  : null;

// Redis event handlers (only if Redis is enabled)
if (redis) {
  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('ready', () => {
    logger.info('Redis is ready');
  });

  redis.on('error', error => {
    logger.error('Redis connection error:', error);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Reconnecting to Redis...');
  });
} else {
  logger.warn('Redis is disabled - caching features will be unavailable');
}

// Redis utility functions
export class RedisService {
  // Cache operations
  static async get(key: string): Promise<string | null> {
    if (!redis) return null;
    try {
      return await redis.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!redis) return false;
    try {
      if (ttl) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    if (!redis) return false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  // JSON operations
  static async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis JSON GET error for key ${key}:`, error);
      return null;
    }
  }

  static async setJSON<T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      return await this.set(key, jsonValue, ttl);
    } catch (error) {
      logger.error(`Redis JSON SET error for key ${key}:`, error);
      return false;
    }
  }

  // Leaderboard operations (sorted sets)
  static async addToLeaderboard(
    key: string,
    score: number,
    member: string
  ): Promise<boolean> {
    if (!redis) return false;
    try {
      await redis.zadd(key, score, member);
      return true;
    } catch (error) {
      logger.error(`Redis ZADD error for leaderboard ${key}:`, error);
      return false;
    }
  }

  static async getLeaderboard(
    key: string,
    start: number = 0,
    stop: number = -1,
    withScores: boolean = true
  ): Promise<string[] | Array<{ member: string; score: number }>> {
    if (!redis) return [];
    try {
      if (withScores) {
        const result = await redis.zrevrange(key, start, stop, 'WITHSCORES');
        const leaderboard: Array<{ member: string; score: number }> = [];

        for (let i = 0; i < result.length; i += 2) {
          const member = result[i];
          const scoreStr = result[i + 1];
          if (member && scoreStr) {
            leaderboard.push({
              member: member,
              score: parseFloat(scoreStr),
            });
          }
        }

        return leaderboard;
      } else {
        return await redis.zrevrange(key, start, stop);
      }
    } catch (error) {
      logger.error(`Redis ZREVRANGE error for leaderboard ${key}:`, error);
      return [];
    }
  }

  static async getUserRank(
    key: string,
    member: string
  ): Promise<number | null> {
    if (!redis) return null;
    try {
      const rank = await redis.zrevrank(key, member);
      return rank !== null ? rank + 1 : null; // Convert to 1-based ranking
    } catch (error) {
      logger.error(
        `Redis ZREVRANK error for leaderboard ${key}, member ${member}:`,
        error
      );
      return null;
    }
  }

  static async getUserScore(
    key: string,
    member: string
  ): Promise<number | null> {
    if (!redis) return null;
    try {
      const score = await redis.zscore(key, member);
      return score !== null ? parseFloat(score) : null;
    } catch (error) {
      logger.error(
        `Redis ZSCORE error for leaderboard ${key}, member ${member}:`,
        error
      );
      return null;
    }
  }

  // Session operations
  static async setSession(
    sessionId: string,
    sessionData: object,
    ttl: number
  ): Promise<boolean> {
    const key = `session:${sessionId}`;
    return await this.setJSON(key, sessionData, ttl);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    return await this.getJSON<T>(key);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Rate limiting
  static async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!redis) {
      // If Redis is disabled, allow all requests
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + windowMs,
      };
    }
    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);
      const resetTime = Date.now() + ttl;

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      logger.error(`Redis rate limit error for key ${key}:`, error);
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + windowMs,
      };
    }
  }

  // Pub/Sub operations
  static async publish(channel: string, message: string): Promise<boolean> {
    if (!redis) return false;
    try {
      await redis.publish(channel, message);
      return true;
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
      return false;
    }
  }

  static async publishJSON<T>(channel: string, data: T): Promise<boolean> {
    try {
      const message = JSON.stringify(data);
      return await this.publish(channel, message);
    } catch (error) {
      logger.error(`Redis JSON PUBLISH error for channel ${channel}:`, error);
      return false;
    }
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (redis) {
    logger.info('Disconnecting from Redis...');
    await redis.quit();
  }
});

export default redis;
