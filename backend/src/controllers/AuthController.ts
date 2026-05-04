import { Request, Response, NextFunction } from 'express';
import { AuthService, UserSession } from '@/services/AuthService';
import { DiscordService } from '@/services/DiscordService';
// import { KickOAuthService } from '@/services/KickOAuthService'; // Not used - Kick auth disabled
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { RedisService } from '@/config/redis';

export class AuthController {
  // Initiate Discord OAuth flow
  static initiateDiscordAuth = asyncHandler(
    async (req: Request, res: Response) => {
      const state = Math.random().toString(36).substring(2, 15);
      const oauthUrl = DiscordService.generateOAuthURL(state);

      // Store state in Redis with 10 minute expiration (more reliable than cookies for cross-domain)
      await RedisService.set(`oauth_state:${state}`, 'valid', 600); // 10 minutes

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

      if (!state || typeof state !== 'string') {
        throw createError.badRequest('State parameter is required');
      }

      // Validate state parameter from Redis
      const storedState = await RedisService.get(`oauth_state:${state}`);
      if (!storedState) {
        logger.warn(
          'Invalid or expired state parameter in Discord OAuth callback',
          {
            providedState: state.substring(0, 8) + '...',
          }
        );
        throw createError.badRequest(
          'Invalid or expired state parameter - please try logging in again'
        );
      }

      // Delete the state from Redis (one-time use)
      await RedisService.del(`oauth_state:${state}`);

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
        // Use the first CORS origin for redirects (in case multiple are configured)
        const corsOrigins =
          process.env['CORS_ORIGIN'] || 'http://localhost:3000';
        const frontendUrl = corsOrigins.split(',')[0].trim();
        const callbackUrl = `${frontendUrl}/auth/callback?access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}&user_id=${encodeURIComponent(user.id)}&display_name=${encodeURIComponent(user.displayName)}&is_admin=${user.isAdmin}&is_moderator=${user.isModerator}`;

        res.redirect(callbackUrl);
      } catch (error) {
        logger.error('Discord OAuth callback error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Redirect to frontend with error
        // Use the first CORS origin for redirects (in case multiple are configured)
        const corsOrigins =
          process.env['CORS_ORIGIN'] || 'http://localhost:3000';
        const frontendUrl = corsOrigins.split(',')[0].trim();
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Discord authentication failed';
        const callbackUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`;

        res.redirect(callbackUrl);
      }
    }
  );

  /* KICK OAUTH DISABLED - Not currently used
  // Initiate Kick OAuth flow
  static initiateKickAuth = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        // Generate secure state parameter
        const state = KickOAuthService.generateSecureState();

        // Generate OAuth URL
        const authUrl = KickOAuthService.generateAuthURL(state);

        // Store state in session/cache for validation
        // In production, this should be stored in Redis with expiration
        res.cookie('kick_oauth_state', state, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 10 * 60 * 1000, // 10 minutes
          sameSite: 'lax',
        });

        logger.info('Kick OAuth flow initiated', {
          userId: req.user.id,
          state: state.substring(0, 8) + '...', // Log partial state for debugging
        });

        res.json({
          success: true,
          authUrl,
          state,
        });
      } catch (error) {
        logger.error('Kick OAuth initiation error:', {
          userId: req.user?.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw createError.internal('Failed to initiate Kick OAuth');
      }
    }
  );

  // Handle Kick OAuth callback
  static handleKickCallback = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        throw createError.badRequest('Authorization code is required');
      }

      if (!state || typeof state !== 'string') {
        throw createError.badRequest('State parameter is required');
      }

      // Validate state parameter for CSRF protection
      const storedState = req.cookies.kick_oauth_state;
      if (!storedState || storedState !== state) {
        logger.warn('Invalid state parameter in Kick OAuth callback', {
          userId: req.user.id,
          providedState: state.substring(0, 8) + '...',
          storedState: storedState?.substring(0, 8) + '...',
        });
        throw createError.badRequest(
          'Invalid state parameter - possible CSRF attack'
        );
      }

      // Clear state cookie
      res.clearCookie('kick_oauth_state');

      try {
        // Exchange authorization code for tokens
        const tokens = await KickOAuthService.exchangeCodeForTokens(code);

        // Get Kick user info
        const kickUser = await KickOAuthService.getUserInfo(tokens.accessToken);

        // Store tokens and user info
        await KickOAuthService.storeUserTokens(req.user.id, tokens, kickUser);

        logger.info('Kick OAuth callback successful', {
          userId: req.user.id,
          kickUsername: kickUser.username,
          kickId: kickUser.id,
        });

        // Redirect to frontend with success
        const frontendUrl =
          process.env['CORS_ORIGIN'] || 'http://localhost:3000';
        const callbackUrl = `${frontendUrl}/profile?kick_linked=true&kick_username=${encodeURIComponent(kickUser.username)}`;

        res.redirect(callbackUrl);
      } catch (error) {
        logger.error('Kick OAuth callback error:', {
          userId: req.user.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Redirect to frontend with error
        const frontendUrl =
          process.env['CORS_ORIGIN'] || 'http://localhost:3000';
        const errorMessage =
          error instanceof Error ? error.message : 'Kick OAuth failed';
        const callbackUrl = `${frontendUrl}/profile?kick_error=${encodeURIComponent(errorMessage)}`;

        res.redirect(callbackUrl);
      }
    }
  );

  // Unlink Kick account
  static unlinkKickAccount = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        await KickOAuthService.revokeTokens(req.user.id);

        logger.info('Kick account unlinked successfully', {
          userId: req.user.id,
        });

        res.json({
          success: true,
          message: 'Kick account unlinked successfully',
        });
      } catch (error) {
        logger.error('Kick account unlinking error:', {
          userId: req.user.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw createError.internal('Failed to unlink Kick account');
      }
    }
  );

  // Get Kick account status
  static getKickStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      try {
        const tokens = await KickOAuthService.getUserTokens(req.user.id);

        if (!tokens) {
          return res.json({
            success: true,
            linked: false,
          });
        }

        // Check if token is still valid
        const isValid = await KickOAuthService.validateToken(
          tokens.accessToken
        );

        if (!isValid) {
          // Try to refresh the token
          const refreshed = await KickOAuthService.refreshUserTokens(
            req.user.id
          );

          if (!refreshed) {
            return res.json({
              success: true,
              linked: false,
              error: 'Token expired and refresh failed',
            });
          }
        }

        // Get fresh user data from database
        const userSession = await AuthService.getUserSession(
          req.headers.authorization?.substring(7) || ''
        );

        res.json({
          success: true,
          linked: true,
          username: userSession?.kickUsername,
          // Note: We don't return channel points here as they should be fetched separately
        });
      } catch (error) {
        logger.error('Get Kick status error:', {
          userId: req.user.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        res.json({
          success: true,
          linked: false,
          error: 'Failed to check Kick status',
        });
      }
    }
  );
  END KICK OAUTH DISABLED */

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
            totalEarned: userSession.totalEarned || 0,
            totalSpent: userSession.totalSpent || 0,
            isAdmin: userSession.isAdmin,
            isModerator: userSession.isModerator,
            kickUsername: userSession.kickUsername,
            rainbetUsername: userSession.rainbetUsername,
            rainbetVerified: userSession.rainbetVerified || false,
            createdAt: userSession.createdAt,
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

  // Submit Rainbet username (can only be done once by user)
  static submitRainbetUsername = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { rainbetUsername } = req.body;

      if (!rainbetUsername || typeof rainbetUsername !== 'string') {
        throw createError.badRequest('Rainbet username is required');
      }

      const trimmedUsername = rainbetUsername.trim();

      if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
        throw createError.badRequest(
          'Rainbet username must be between 3 and 50 characters'
        );
      }

      try {
        // Check if user already has a Rainbet username
        const userSession = await AuthService.getUserSession(
          req.headers.authorization?.substring(7) || ''
        );

        if (userSession?.rainbetUsername) {
          throw createError.badRequest(
            'Rainbet username already set. Contact an admin to change it.'
          );
        }

        // Update user's Rainbet username
        await AuthService.updateRainbetUsername(req.user.id, trimmedUsername);

        logger.info(
          `User ${req.user.discordId} submitted Rainbet username: ${trimmedUsername}`
        );

        res.json({
          success: true,
          message:
            'Rainbet username submitted successfully. Waiting for admin verification.',
          rainbetUsername: trimmedUsername,
        });
      } catch (error) {
        logger.error('Submit Rainbet username error:', {
          userId: req.user.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }
  );

  // Submit Kick username (can only be done once by user)
  static submitKickUsername = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      const { kickUsername } = req.body;

      if (!kickUsername || typeof kickUsername !== 'string') {
        throw createError.badRequest('Kick username is required');
      }

      const trimmedUsername = kickUsername.trim();

      if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
        throw createError.badRequest(
          'Kick username must be between 3 and 50 characters'
        );
      }

      try {
        // Check if user already has a Kick username
        const userSession = await AuthService.getUserSession(
          req.headers.authorization?.substring(7) || ''
        );

        if (userSession?.kickUsername) {
          throw createError.badRequest(
            'Kick username already set. Contact an admin to change it.'
          );
        }

        // Update user's Kick username
        await AuthService.updateKickUsername(req.user.id, trimmedUsername);

        logger.info(
          `User ${req.user.discordId} submitted Kick username: ${trimmedUsername}`
        );

        res.json({
          success: true,
          message:
            'Kick username submitted successfully. Waiting for admin verification.',
          kickUsername: trimmedUsername,
        });
      } catch (error) {
        logger.error('Submit Kick username error:', {
          userId: req.user.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }
  );
}
