import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '@/middleware/errorHandler';
import { validateEnv } from '@/config/env';

const env = validateEnv();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    discordId: string;
    isAdmin: boolean;
    isModerator: boolean;
    iat?: number;
    exp?: number;
  };
  token?: string; // resolved access token (cookie or Bearer), set by authMiddleware
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
    // Cookie-first, then Bearer header as fallback (for admin pages and Socket.IO)
    const cookieToken = req.cookies?.access_token as string | undefined;
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : undefined;

    const token = cookieToken || bearerToken;

    if (!token) {
      throw createError.unauthorized('Access token required');
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = decoded;
      req.token = token;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw createError.unauthorized('Access token expired');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw createError.unauthorized('Invalid access token');
      } else {
        throw createError.unauthorized('Token verification failed');
      }
    }
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
    const cookieToken = req.cookies?.access_token as string | undefined;
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : undefined;

    const token = cookieToken || bearerToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        req.user = decoded;
        req.token = token;
      } catch {
        // Ignore JWT errors for optional auth — user will be undefined
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
