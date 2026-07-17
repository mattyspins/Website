import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '@/middleware/errorHandler';
import { validateEnv } from '@/config/env';
import { RedisService } from '@/config/redis';
import { prisma } from '@/config/database';

const env = validateEnv();

// Cache TTL for the suspended-status lookup — bounds how long a just-suspended
// user can keep using an already-issued token to a few seconds instead of the
// full token lifetime, without hitting the database on every request.
const SUSPENSION_CACHE_TTL_SECONDS = 30;

// ─── Auth cookies ───────────────────────────────────────────────────────────
// Tokens are transported in httpOnly cookies so page JavaScript can never read
// them; an XSS therefore can't exfiltrate a session the way it could when the
// token lived in localStorage.
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const isProd = env.NODE_ENV === 'production';

/**
 * SameSite=lax keeps the cookie attached through the Discord OAuth redirect
 * (a top-level GET navigation) while still blocking it on cross-site
 * subrequests, which is what a CSRF would need. `secure` is off in dev so the
 * cookie survives plain-http localhost.
 */
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Cookie lifetime is read off the token's own `exp` rather than hardcoded.
 *
 * A cookie that outlives its token is harmless (the request 401s and the client
 * refreshes), but a cookie that dies *before* its token silently destroys the
 * only credential a cookie-authenticated request carries, while the client still
 * believes the session is good and so never refreshes. JWT_EXPIRES_IN is
 * configurable per-environment, so deriving the lifetime is the only way these
 * two cannot drift apart again.
 */
const cookieMaxAge = (token: string, fallbackMs: number): number => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return fallbackMs;
  const remainingMs = decoded.exp * 1000 - Date.now();
  return remainingMs > 0 ? remainingMs : fallbackMs;
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken?: string }
): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: cookieMaxAge(tokens.accessToken, 60 * 60 * 1000),
  });
  if (tokens.refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: cookieMaxAge(tokens.refreshToken, 7 * 24 * 60 * 60 * 1000),
    });
  }
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);
};

const isTokenRevoked = async (token: string): Promise<boolean> => {
  const revoked = await RedisService.get(`revoked:${token}`);
  return revoked === '1';
};

const isUserSuspended = async (userId: string): Promise<boolean> => {
  const cached = await RedisService.get(`suspended:${userId}`);
  if (cached !== null) {
    return cached === '1';
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuspended: true, suspensionExpiresAt: true },
  });

  const suspended = Boolean(
    user?.isSuspended &&
      (!user.suspensionExpiresAt || user.suspensionExpiresAt > new Date())
  );

  await RedisService.set(
    `suspended:${userId}`,
    suspended ? '1' : '0',
    SUSPENSION_CACHE_TTL_SECONDS
  );

  return suspended;
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    discordId: string;
    isAdmin: boolean;
    isModerator: boolean;
    iat?: number;
    exp?: number;
  };
}

export interface JWTPayload {
  id: string;
  discordId: string;
  isAdmin: boolean;
  isModerator: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Pulls the access token from the request, preferring the httpOnly cookie over
 * the Authorization header.
 *
 * The cookie is the safer transport: it can't be read by JavaScript, so an XSS
 * can't exfiltrate it the way it can a token kept in localStorage.
 *
 * The Bearer branch is now a compatibility shim with no known caller: every
 * frontend call site goes through `authFetch()` (cookie only), and the OBS
 * overlay/widget routes an earlier comment credited here turned out to be
 * unauthenticated — see `slotRequest.ts` ("Public — for OBS widget"). It is
 * retained only for sessions issued before the cookie rollout, whose tokens are
 * still in localStorage but are no longer read. Once `storeAuthData()` stops
 * writing those tokens and they have aged out, this branch can be deleted.
 */
export const extractAccessToken = (req: Request): string | null => {
  const cookieToken = (req as Request & { cookies?: Record<string, string> })
    .cookies?.[ACCESS_TOKEN_COOKIE];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }
  return null;
};

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      throw createError.unauthorized('Access token required');
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw createError.unauthorized('Access token expired');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw createError.unauthorized('Invalid access token');
      } else {
        throw createError.unauthorized('Token verification failed');
      }
    }

    if (await isTokenRevoked(token)) {
      throw createError.unauthorized('Access token has been revoked');
    }

    if (await isUserSuspended(decoded.id)) {
      throw createError.forbidden('This account has been suspended');
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    if (!req.user.isAdmin) {
      throw createError.forbidden('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const moderatorMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    if (!req.user.isAdmin && !req.user.isModerator) {
      throw createError.forbidden('Moderator access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAccessToken(req);

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        req.user = decoded;
      } catch (jwtError) {
        // Ignore JWT errors for optional auth
        // User will be undefined, which is acceptable
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
