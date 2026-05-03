// @ts-nocheck
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '@/config/database';
import { RedisService } from '@/config/redis';
import { validateEnv } from '@/config/env';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

const env = validateEnv();

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
}

export interface KickUser {
  id: string;
  username: string;
  avatar?: string;
  verified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSession {
  id: string;
  discordId: string;
  displayName: string;
  avatar: string | null;
  points: number;
  totalEarned?: number;
  totalSpent?: number;
  isAdmin: boolean;
  isModerator: boolean;
  kickUsername?: string;
  rainbetUsername?: string;
  rainbetVerified?: boolean;
  createdAt?: string;
}

export class AuthService {
  // Generate JWT tokens
  static generateTokens(user: UserSession): AuthTokens {
    const payload = {
      id: user.id,
      discordId: user.discordId,
      isAdmin: user.isAdmin,
      isModerator: user.isModerator,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    // Parse expiration time
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  // Verify and decode JWT token
  static verifyToken(token: string, isRefreshToken: boolean = false): any {
    const secret = isRefreshToken ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError.unauthorized('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw createError.unauthorized('Invalid token');
      }
      throw createError.unauthorized('Token verification failed');
    }
  }

  // Create or update user from Discord data
  static async createOrUpdateUserFromDiscord(
    discordUser: DiscordUser
  ): Promise<UserSession> {
    try {
      const displayName = `${discordUser.username}#${discordUser.discriminator}`;
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      // Check if user is admin
      const isAdmin = env.ADMIN_DISCORD_IDS.includes(discordUser.id);

      const user = await prisma.user.upsert({
        where: { discordId: discordUser.id },
        update: {
          displayName,
          avatarUrl,
          isAdmin,
          lastActiveAt: new Date(),
        },
        create: {
          discordId: discordUser.id,
          displayName,
          avatarUrl,
          isAdmin,
          points: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });

      // Create user statistics if they don't exist
      await prisma.userStatistics.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
        },
      });

      logger.info(
        `User authenticated via Discord: ${user.displayName} (${user.discordId})`
      );

      return {
        id: user.id,
        discordId: user.discordId,
        displayName: user.displayName,
        avatar: user.avatarUrl,
        points: user.points,
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
        kickUsername: user.kickUsername || undefined,
      };
    } catch (error) {
      logger.error('Error creating/updating user from Discord:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw createError.internal('Failed to process Discord authentication');
    }
  }

  // Verify Kick user and merge with existing user
  static async verifyAndMergeKickUser(
    userId: string,
    kickUser: KickUser
  ): Promise<UserSession> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError.notFound('User not found');
      }

      // Update user with Kick information
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          kickUsername: kickUser.username,
          lastActiveAt: new Date(),
        },
      });

      logger.info(
        `User verified with Kick: ${updatedUser.displayName} -> ${kickUser.username}`
      );

      return {
        id: updatedUser.id,
        discordId: updatedUser.discordId,
        displayName: updatedUser.displayName,
        avatar: updatedUser.avatarUrl,
        points: updatedUser.points,
        isAdmin: updatedUser.isAdmin,
        isModerator: updatedUser.isModerator,
        kickUsername: updatedUser.kickUsername || undefined,
      };
    } catch (error) {
      logger.error('Error verifying Kick user:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw createError.internal('Failed to verify Kick user');
    }
  }

  // Store session in database and Redis
  static async storeSession(
    user: UserSession,
    tokens: AuthTokens,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const tokenHash = await bcrypt.hash(tokens.accessToken, 10);
      const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

      // Store in database
      await prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash,
          refreshTokenHash,
          expiresAt,
          userAgent,
          ipAddress,
        },
      });

      // Store in Redis for fast access
      await RedisService.setSession(tokens.accessToken, user, tokens.expiresIn);

      logger.info(`Session stored for user: ${user.displayName}`);
    } catch (error) {
      logger.error('Error storing session:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw createError.internal('Failed to store session');
    }
  }

  // Refresh access token
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this.verifyToken(refreshToken, true);

      // Find user session
      const session = await prisma.userSession.findFirst({
        where: {
          userId: decoded.id,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        throw createError.unauthorized('Invalid refresh token');
      }

      // Verify refresh token hash
      const isValidRefreshToken = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash || ''
      );
      if (!isValidRefreshToken) {
        throw createError.unauthorized('Invalid refresh token');
      }

      // Generate new tokens
      const userSession: UserSession = {
        id: session.user.id,
        discordId: session.user.discordId,
        displayName: session.user.displayName,
        avatar: session.user.avatarUrl,
        points: session.user.points,
        isAdmin: session.user.isAdmin,
        isModerator: session.user.isModerator,
        kickUsername: session.user.kickUsername || undefined,
      };

      const newTokens = this.generateTokens(userSession);

      // Update session in database
      const newTokenHash = await bcrypt.hash(newTokens.accessToken, 10);
      const newRefreshTokenHash = await bcrypt.hash(newTokens.refreshToken, 10);
      const newExpiresAt = new Date(Date.now() + newTokens.expiresIn * 1000);

      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          tokenHash: newTokenHash,
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
          lastUsedAt: new Date(),
        },
      });

      // Update Redis session
      await RedisService.setSession(
        newTokens.accessToken,
        userSession,
        newTokens.expiresIn
      );

      logger.info(`Token refreshed for user: ${userSession.displayName}`);

      return newTokens;
    } catch (error) {
      logger.error('Error refreshing token:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw createError.unauthorized('Failed to refresh token');
    }
  }

  // Logout user (invalidate all sessions)
  static async logout(userId: string): Promise<void> {
    try {
      // Get all user sessions
      const sessions = await prisma.userSession.findMany({
        where: { userId },
      });

      // Remove from Redis
      for (const session of sessions) {
        // We can't easily get the original token from hash, so we'll use a pattern
        // In a real implementation, you might store session IDs in Redis
        await RedisService.del(`session:${session.id}`);
      }

      // Remove from database
      await prisma.userSession.deleteMany({
        where: { userId },
      });

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Error during logout:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw createError.internal('Failed to logout');
    }
  }

  // Get user session from token
  static async getUserSession(token: string): Promise<UserSession | null> {
    try {
      // Try Redis first
      const cachedSession = await RedisService.getSession<UserSession>(token);
      if (cachedSession) {
        return cachedSession;
      }

      // Fallback to database
      const decoded = this.verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return null;
      }

      const userSession: UserSession = {
        id: user.id,
        discordId: user.discordId,
        displayName: user.displayName,
        avatar: user.avatarUrl,
        points: user.points,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
        kickUsername: user.kickUsername || undefined,
        rainbetUsername: user.rainbetUsername || undefined,
        rainbetVerified: user.rainbetVerified,
        createdAt: user.createdAt.toISOString(),
      };

      // Cache in Redis
      await RedisService.setSession(token, userSession, 3600); // 1 hour

      return userSession;
    } catch (error) {
      logger.error('Error getting user session:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  // Validate user session and update last active
  static async validateAndUpdateSession(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      logger.error('Error updating user session:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw error as this is not critical
    }
  }

  // Update Rainbet username (can only be done once by user)
  static async updateRainbetUsername(
    userId: string,
    rainbetUsername: string
  ): Promise<void> {
    try {
      // Check if user already has a Rainbet username
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rainbetUsername: true },
      });

      if (user?.rainbetUsername) {
        throw createError.badRequest(
          'Rainbet username already set. Contact an admin to change it.'
        );
      }

      // Update user's Rainbet username (unverified)
      await prisma.user.update({
        where: { id: userId },
        data: {
          rainbetUsername,
          rainbetVerified: false, // Admin needs to verify
          updatedAt: new Date(),
        },
      });

      logger.info(
        `Rainbet username set for user ${userId}: ${rainbetUsername}`
      );
    } catch (error) {
      logger.error('Error updating Rainbet username:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Update Kick username (can only be done once by user)
  static async updateKickUsername(
    userId: string,
    kickUsername: string
  ): Promise<void> {
    try {
      // Check if user already has a Kick username
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kickUsername: true },
      });

      if (user?.kickUsername) {
        throw createError.badRequest(
          'Kick username already set. Contact an admin to change it.'
        );
      }

      // Update user's Kick username
      await prisma.user.update({
        where: { id: userId },
        data: {
          kickUsername,
          updatedAt: new Date(),
        },
      });

      logger.info(`Kick username set for user ${userId}: ${kickUsername}`);
    } catch (error) {
      logger.error('Error updating Kick username:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
