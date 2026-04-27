import { Request, Response, NextFunction } from 'express';
import { AuthService, UserSession } from '@/services/AuthService';
import { DiscordService } from '@/services/DiscordService';
import { KickService } from '@/services/KickService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';

export class AuthController {
  // Initiate Discord OAuth flow
  static initiateDiscordAuth = asyncHandler(
    async (req: Request, res: Response) => {
      const state = Math.random().toString(36).substring(2, 15);
      const oauthUrl = DiscordService.generateOAuthURL(state);

      // Store state in session/cache for validation
      // In production, you might want to store this in Redis with expiration
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000, // 10 minutes
      });

      res.json({
        success: true,
        authUrl: oauthUrl,
        state,
      });
    }
  );

  // Handle Discord OAuth callback
  static handleDiscordCallback = asyncHandler(
    async (req: Request, res: Response) => {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        throw createError.badRequest('Authorization code is required');
      }

      // Validate state parameter
      const storedState = req.cookies.oauth_state;
      if (!storedState || storedState !== state) {
        throw createError.badRequest('Invalid state parameter');
      }

      // Clear state cookie
      res.clearCookie('oauth_state');

      try {
        // Exchange code for Discord tokens
        const discordTokens = await DiscordService.exchangeCodeForTokens(code);

        // Get Discord user info
        const discordUser = await DiscordService.getUserInfo(
          discordTokens.access_token
        );

        // Check if Discord server membership verification is enabled
        const requireServerMembership =
          process.env['DISCORD_REQUIRE_SERVER_MEMBERSHIP'] === 'true';
        const discordGuildId = process.env['DISCORD_GUILD_ID'];

        if (requireServerMembership && discordGuildId) {
          // Check if user is a member of the Discord server
          const isMember = await DiscordService.checkServerMembership(
            discordTokens.access_token,
            discordGuildId
          );

          if (!isMember) {
            const inviteUrl =
              process.env['DISCORD_INVITE_URL'] ||
              'https://discord.gg/your-invite';

            logger.warn(
              `User ${discordUser.username} attempted to login but is not a member of the Discord server`
            );

            throw createError.forbidden(
              `You must be a member of the MattySpins Discord server to use this platform. Join here: ${inviteUrl}`
            );
          }

          logger.info(
            `User ${discordUser.username} verified as Discord server member`
          );
        }

        // Create or update user
        const user =
          await AuthService.createOrUpdateUserFromDiscord(discordUser);

        // Generate JWT tokens
        const tokens = AuthService.generateTokens(user);

        // Store session
        await AuthService.storeSession(
          user,
          tokens,
          req.get('User-Agent'),
          req.ip
        );

        logger.info(
          `Discord authentication successful for user: ${user.displayName}`
        );

        // Redirect to frontend with tokens
        const frontendUrl =
          process.env['CORS_ORIGIN'] || 'http://localhost:3000';
        const callbackUrl = `${frontendUrl}/auth/callback?access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}&user_id=${encodeURIComponent(user.id)}&display_name=${encodeURIComponent(user.displayName)}&is_admin=${user.isAdmin}&is_moderator=${user.isModerator}`;

        res.redirect(callbackUrl);
      } catch (error) {
        logger.error('Discord OAuth callback error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Redirect to frontend with error
        const frontendUrl =
          process.env['CORS_ORIGIN'] || 'http://localhost:3000';
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Discord authentication failed';
        const callbackUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`;

        res.redirect(callbackUrl);
      }
    }
  );

  // Initiate Kick verification
  static initiateKickVerification = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { kickUsername } = req.body;

      if (!kickUsername || typeof kickUsername !== 'string') {
        throw createError.badRequest('Kick username is required');
      }

      try {
        // Verify Kick user exists
        const kickUser = await KickService.getUserInfo(kickUsername);

        if (!kickUser) {
          throw createError.notFound('Kick user not found');
        }

        // Update user with Kick information
        const updatedUser = await AuthService.verifyAndMergeKickUser(
          req.user.id,
          kickUser
        );

        logger.info(
          `Kick verification successful for user: ${updatedUser.displayName} -> ${kickUser.username}`
        );

        res.json({
          success: true,
          user: {
            id: updatedUser.id,
            discordId: updatedUser.discordId,
            displayName: updatedUser.displayName,
            avatar: updatedUser.avatar,
            points: updatedUser.points,
            isAdmin: updatedUser.isAdmin,
            isModerator: updatedUser.isModerator,
            kickUsername: updatedUser.kickUsername,
          },
          message: 'Kick verification completed successfully',
        });
      } catch (error) {
        logger.error('Kick verification error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw createError.internal('Kick verification failed');
      }
    }
  );

  // Refresh access token
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw createError.badRequest('Refresh token is required');
    }

    try {
      const newTokens = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        tokens: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to let error handler deal with it
    }
  });

  // Get current user info
  static getCurrentUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        // Update last active time
        await AuthService.validateAndUpdateSession(req.user.id);

        // Get fresh user data
        const userSession = await AuthService.getUserSession(
          req.headers.authorization?.substring(7) || ''
        );

        if (!userSession) {
          throw createError.unauthorized('Invalid session');
        }

        res.json({
          success: true,
          user: {
            id: userSession.id,
            discordId: userSession.discordId,
            displayName: userSession.displayName,
            avatar: userSession.avatar,
            points: userSession.points,
            isAdmin: userSession.isAdmin,
            isModerator: userSession.isModerator,
            kickUsername: userSession.kickUsername,
          },
        });
      } catch (error) {
        logger.error('Get current user error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw createError.internal('Failed to get user information');
      }
    }
  );

  // Logout user
  static logout = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        await AuthService.logout(req.user.id);

        logger.info(`User logged out: ${req.user.discordId}`);

        res.json({
          success: true,
          message: 'Logged out successfully',
        });
      } catch (error) {
        logger.error('Logout error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw createError.internal('Logout failed');
      }
    }
  );

  // Validate token endpoint
  static validateToken = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Invalid token');
      }

      res.json({
        success: true,
        valid: true,
        user: {
          id: req.user.id,
          discordId: req.user.discordId,
          isAdmin: req.user.isAdmin,
          isModerator: req.user.isModerator,
        },
      });
    }
  );

  // Get authentication status
  static getAuthStatus = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({
        success: true,
        authenticated: false,
      });
    }

    const token = authHeader.substring(7);

    try {
      const userSession = await AuthService.getUserSession(token);

      if (!userSession) {
        return res.json({
          success: true,
          authenticated: false,
        });
      }

      res.json({
        success: true,
        authenticated: true,
        user: {
          id: userSession.id,
          discordId: userSession.discordId,
          displayName: userSession.displayName,
          avatar: userSession.avatar,
          points: userSession.points,
          isAdmin: userSession.isAdmin,
          isModerator: userSession.isModerator,
          kickUsername: userSession.kickUsername,
        },
      });
    } catch (error) {
      res.json({
        success: true,
        authenticated: false,
      });
    }
  });
}
