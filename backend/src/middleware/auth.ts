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

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = decoded;
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
