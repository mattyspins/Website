import rateLimitFactory, { Options, RateLimitRequestHandler } from 'express-rate-limit';
import { redis } from '@/config/redis';
import { RedisRateLimitStore } from '@/config/rateLimitStore';

// Drop-in replacement for `express-rate-limit`'s default export. Every route
// file already builds its limiters with `rateLimit({ windowMs, max, ... })`;
// importing from here instead of the package directly gives all of them a
// shared Redis-backed counter for free, with no per-call-site changes needed.
// Falls back to the package's own in-memory store when Redis isn't configured.
//
// Each call gets its own store instance (express-rate-limit rejects a shared
// one) with its own key namespace, so unrelated limiters never share counters.
let limiterCount = 0;

export default function rateLimit(
  options: Partial<Options>
): RateLimitRequestHandler {
  return rateLimitFactory({
    ...options,
    store: options.store ?? (redis ? new RedisRateLimitStore(String(limiterCount++)) : undefined),
  } as Options);
}
