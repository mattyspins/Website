import { Request, Response, NextFunction } from 'express';
import { AuthService, UserSession } from '@/services/AuthService';
import { DiscordService } from '@/services/DiscordService';
import { KickOAuthService } from '@/services/KickOAuthService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { RedisService } from '@/config/redis';
import { prisma } from '@/config/database';

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

  // Initiate Kick OAuth flow — returns auth URL for the user to be redirected to
  static initiateKickAuth = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw createError.unauthorized('Authentication required');
      }

      // Already linked?
      const existing = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { kickVerified: true, kickUsername: true },
      });
      if (existing?.kickVerified && existing.kickUsername) {
        const token = req.headers.authorization?.substring(7);
        if (token) await RedisService.deleteSession(token);
        return res.json({ success: true, alreadyLinked: true, kickUsername: existing.kickUsername });
      }

      try {
        const state = KickOAuthService.generateSecureState();
        const { codeChallenge } = await KickOAuthService.generatePKCE(state);
        const authUrl = KickOAuthService.generateAuthURL(state, codeChallenge);

        // Store userId → state in Redis (10-min TTL)
        await RedisService.set(`kick_oauth_state:${state}`, req.user.id, 600);

        logger.info('Kick OAuth flow initiated (PKCE)', { userId: req.user.id });

        res.json({ success: true, authUrl, state });
      } catch (error) {
        logger.error('Kick OAuth initiation error:', { userId: req.user?.id, message: (error as Error).message });
        throw createError.internal('Failed to initiate Kick OAuth');
      }
    }
  );

  // Handle Kick OAuth callback — public route, state identifies the user via Redis
  static handleKickCallback = asyncHandler(
    async (req: Request, res: Response) => {
      const { code, state } = req.query;
      const frontendUrl = (process.env['CORS_ORIGIN'] || 'http://localhost:3000').split(',')[0].trim();

      if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
        return res.redirect(`${frontendUrl}/profile?kick_error=Missing+code+or+state`);
      }

      // Look up userId from Redis state
      const userId = await RedisService.get(`kick_oauth_state:${state}`);
      if (!userId) {
        return res.redirect(`${frontendUrl}/profile?kick_error=Session+expired.+Please+try+again.`);
      }
      await RedisService.del(`kick_oauth_state:${state}`);

      // Retrieve PKCE verifier
      const codeVerifier = await RedisService.get(`kick_pkce:${state}`);
      if (!codeVerifier) {
        return res.redirect(`${frontendUrl}/profile?kick_error=Session+expired.+Please+try+again.`);
      }
      await RedisService.del(`kick_pkce:${state}`);

      try {
        // Exchange authorization code for tokens (with PKCE)
        const tokens = await KickOAuthService.exchangeCodeForTokens(code, codeVerifier);

        // Get Kick user info
        const kickUser = await KickOAuthService.getUserInfo(tokens.accessToken);

        // Store tokens and user info
        await KickOAuthService.storeUserTokens(userId, tokens, kickUser);

        logger.info('Kick OAuth callback successful', {
          userId,
          kickUsername: kickUser.username,
          kickId: kickUser.id,
        });

        // Redirect to frontend with success
        const callbackUrl = `${frontendUrl}/profile?kick_linked=true&kick_username=${encodeURIComponent(kickUser.username)}`;
        res.redirect(callbackUrl);
      } catch (error) {
        logger.error('Kick OAuth callback error:', { userId, message: (error as Error).message });
        const errorMessage = (error as Error).message || 'Kick OAuth failed';
        res.redirect(`${frontendUrl}/profile?kick_error=${encodeURIComponent(errorMessage)}`);
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
        // Clear kickVerified too
        await prisma.user.update({ where: { id: req.user.id }, data: { kickVerified: false } });

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
            kickVerified: userSession.kickVerified || false,
            rainbetUsername: userSession.rainbetUsername,
            rainbetVerified: userSession.rainbetVerified || false,
            totalWagered: userSession.totalWagered || 0,
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
            'AceBet username already set. Contact an admin to change it.'
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

  // Initiate Kick chat verification — generates a code the user types in stream chat
  static initiateKickChatVerify = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw createError.unauthorized('Authentication required');

      const { kickUsername } = req.body;
      if (!kickUsername || typeof kickUsername !== 'string') {
        throw createError.badRequest('kickUsername is required');
      }

      const trimmed = kickUsername.trim().toLowerCase();
      if (trimmed.length < 2 || trimmed.length > 50) {
        throw createError.badRequest('Kick username must be 2–50 characters');
      }

      // Already verified?
      const existing = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { kickVerified: true, kickUsername: true },
      });
      if (existing?.kickVerified && existing.kickUsername) {
        const token = req.headers.authorization?.substring(7);
        if (token) await RedisService.deleteSession(token);
        return res.json({ success: true, alreadyVerified: true, kickUsername: existing.kickUsername });
      }

      // Note: Kick's API is Cloudflare-protected server-side; we skip the channel existence check
      // and rely on the chat verification step to confirm the username is real.

      // Check if another verified user already has this username
      const taken = await prisma.user.findFirst({
        where: {
          kickUsername: { equals: trimmed, mode: 'insensitive' },
          kickVerified: true,
          id: { not: req.user.id },
        },
        select: { id: true },
      });
      if (taken) throw createError.conflict('That Kick username is already linked to another account.');

      // Generate 6-char alphanumeric code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const pendingData = JSON.stringify({ kickUsername: trimmed, code });

      // 10-minute expiry
      await RedisService.set(`kick_verify:${req.user.id}`, pendingData, 600);
      await RedisService.set(`kick_verify_code:${code}`, req.user.id, 600);

      logger.info(`KickVerify: initiated for user ${req.user.id} → ${trimmed} code=${code}`);

      res.json({ success: true, code, kickUsername: trimmed, expiresIn: 600 });
    }
  );

  // Poll verification status — frontend calls every 5 s
  static checkKickVerifyStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw createError.unauthorized('Authentication required');

      // Helper: bust the session cache by access token so next /api/auth/me is fresh
      const bustSessionCache = async () => {
        const token = req.headers.authorization?.substring(7);
        if (token) await RedisService.deleteSession(token);
      };

      // Check if chat verification just completed
      const verifiedUsername = await RedisService.get(`kick_verified_signal:${req.user.id}`);
      if (verifiedUsername) {
        await RedisService.del(`kick_verified_signal:${req.user.id}`);
        await bustSessionCache();
        return res.json({ success: true, verified: true, kickUsername: verifiedUsername });
      }

      // Check DB for already-verified
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { kickVerified: true, kickUsername: true },
      });
      if (user?.kickVerified && user.kickUsername) {
        await bustSessionCache();
        return res.json({ success: true, verified: true, kickUsername: user.kickUsername });
      }

      // Return pending info if code still active
      const pendingRaw = await RedisService.get(`kick_verify:${req.user.id}`);
      if (pendingRaw) {
        const { kickUsername: pendingUsername, code } = JSON.parse(pendingRaw);
        return res.json({ success: true, verified: false, pending: true, kickUsername: pendingUsername, code });
      }

      res.json({ success: true, verified: false, pending: false });
    }
  );
}
