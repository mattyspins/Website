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

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken?: string }
): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15m — mirrors the access token's own lifetime
  });
  if (tokens.refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
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
 * can't exfiltrate it the way it can a token kept in localStorage. The Bearer
 * header remains supported so existing clients (and the OBS overlay routes)
 * keep working while the frontend is migrated off localStorage.
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
