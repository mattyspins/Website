import type { Store, IncrementResponse, Options } from 'express-rate-limit';
import { redis, isRedisReady } from '@/config/redis';
import { logger } from '@/utils/logger';

// A Store backed by the shared Redis connection so rate limits are counted
// across all instances instead of per-process — express-rate-limit's default
// MemoryStore resets per instance, which silently multiplies the effective
// limit once the app scales beyond a single process.
export class RedisRateLimitStore implements Store {
  private windowMs = 60_000;

  // Each limiter in the app needs its own store instance (express-rate-limit
  // rejects a shared instance) *and* its own Redis key namespace — otherwise
  // two unrelated limiters (e.g. login vs. admin actions) would share a
  // counter for the same client and rate-limit each other by accident.
  constructor(public readonly prefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return `ratelimit:${this.prefix}:${key}`;
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (!redis || !isRedisReady()) {
      // Redis unavailable — fail open rather than blocking requests on a
      // broken counter (matches RedisService's fallback philosophy).
      return { totalHits: 0, resetTime: undefined };
    }

    try {
      const redisKey = this.key(key);
      const totalHits = await redis.incr(redisKey);
      if (totalHits === 1) {
        await redis.pexpire(redisKey, this.windowMs);
      }
      const ttl = await redis.pttl(redisKey);
      return {
        totalHits,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined,
      };
    } catch (error) {
      logger.error(`Redis rate-limit increment failed for key ${key}:`, error);
      return { totalHits: 0, resetTime: undefined };
    }
  }

  async decrement(key: string): Promise<void> {
    if (!redis || !isRedisReady()) return;
    try {
      await redis.decr(this.key(key));
    } catch (error) {
      logger.error(`Redis rate-limit decrement failed for key ${key}:`, error);
    }
  }

  async resetKey(key: string): Promise<void> {
    if (!redis || !isRedisReady()) return;
    try {
      await redis.del(this.key(key));
    } catch (error) {
      logger.error(`Redis rate-limit reset failed for key ${key}:`, error);
    }
  }
}
