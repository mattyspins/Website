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

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError.unauthorized('Access token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

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
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
          req.user = decoded;
        } catch (jwtError) {
          // Ignore JWT errors for optional auth
          // User will be undefined, which is acceptable
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
