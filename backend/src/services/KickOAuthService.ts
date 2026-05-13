import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { validateEnv } from '../config/env';
import { logger } from '../utils/logger';
import { getEncryptionService } from './EncryptionService';
import { RedisService } from '../config/redis';
import { PrismaClient } from '@prisma/client';

const env = validateEnv();
const prisma = new PrismaClient();
const encryptionService = getEncryptionService();

export interface KickTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface KickUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
}

export class KickAPIError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'KickAPIError';
  }
}

export class KickOAuthService {
  private static readonly OAUTH_BASE_URL = env.KICK_OAUTH_BASE_URL;
  private static readonly API_BASE_URL = env.KICK_API_BASE_URL;
  private static readonly CLIENT_ID = env.KICK_CLIENT_ID;
  private static readonly CLIENT_SECRET = env.KICK_CLIENT_SECRET;
  private static readonly REDIRECT_URI = env.KICK_REDIRECT_URI;

  /** Generate a PKCE code_verifier + code_challenge pair and cache verifier in Redis */
  static async generatePKCE(state: string): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    // Store verifier alongside the state (same 10-min TTL)
    await RedisService.set(`kick_pkce:${state}`, codeVerifier, 600);
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generates OAuth authorization URL with PKCE and state parameter
   */
  static generateAuthURL(state: string, codeChallenge: string): string {
    if (!state || state.length < 16) {
      throw new Error('Invalid state parameter for OAuth flow');
    }

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope: 'user:read channel:read',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${this.OAUTH_BASE_URL}/authorize?${params.toString()}`;

    logger.info('Generated Kick OAuth URL (PKCE)', {
      state: state.substring(0, 8) + '...',
      redirectUri: this.REDIRECT_URI,
    });

    return authUrl;
  }

  /**
   * Exchanges authorization code for access and refresh tokens (with PKCE verifier)
   */
  static async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<KickTokens> {
    if (!code || code.trim().length === 0) {
      throw new KickAPIError(400, 'BAD_REQUEST', 'Authorization code is required', false);
    }

    try {
      logger.info('Exchanging authorization code for tokens');

      const response = await axios.post(
        `${this.OAUTH_BASE_URL}/token`,
        {
          grant_type: 'authorization_code',
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          redirect_uri: this.REDIRECT_URI,
          code: code,
          code_verifier: codeVerifier,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'StreamingBackend/1.0',
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (!data.access_token || !data.refresh_token) {
        throw new KickAPIError(
          400,
          'INVALID_RESPONSE',
          'Invalid token response from Kick OAuth',
          false
        );
      }

      const tokens: KickTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 3600,
        tokenType: data.token_type || 'Bearer',
      };

      logger.info('Successfully exchanged code for tokens', {
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      });

      return tokens;
    } catch (error) {
      logger.error('Token exchange failed:', error);
      throw this.handleKickAPIError(error);
    }
  }

  /**
   * Refreshes access token using refresh token
   * Implements Requirements 2.1, 2.2
   */
  static async refreshAccessToken(refreshToken: string): Promise<KickTokens> {
    if (!refreshToken || refreshToken.trim().length === 0) {
      throw new KickAPIError(
        400,
        'BAD_REQUEST',
        'Refresh token is required',
        false
      );
    }

    try {
      logger.info('Refreshing access token');

      const response = await axios.post(
        `${this.OAUTH_BASE_URL}/token`,
        {
          grant_type: 'refresh_token',
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'StreamingBackend/1.0',
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      if (!data.access_token) {
        throw new KickAPIError(
          400,
          'INVALID_REFRESH_RESPONSE',
          'Invalid refresh token response from Kick OAuth',
          false
        );
      }

      const tokens: KickTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some APIs don't rotate refresh tokens
        expiresIn: data.expires_in || 3600,
        tokenType: data.token_type || 'Bearer',
      };

      logger.info('Successfully refreshed access token', {
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw this.handleKickAPIError(error);
    }
  }

  /**
   * Validates access token by making a test API call
   * Implements Requirements 2.3
   */
  static async validateToken(accessToken: string): Promise<boolean> {
    if (!accessToken || accessToken.trim().length === 0) {
      return false;
    }

    try {
      const response = await axios.get(`${this.API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'StreamingBackend/1.0',
        },
        timeout: 5000,
      });

      const isValid = response.status === 200 && response.data?.id;

      logger.debug('Token validation result', {
        isValid,
        userId: response.data?.id,
      });

      return isValid;
    } catch (error) {
      logger.debug('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Fetches user information using access token
   * Implements Requirements 1.6
   */
  static async getUserInfo(accessToken: string): Promise<KickUser> {
    if (!accessToken || accessToken.trim().length === 0) {
      throw new KickAPIError(
        400,
        'BAD_REQUEST',
        'Access token is required',
        false
      );
    }

    try {
      logger.info('Fetching user info from Kick API');

      const response = await axios.get(`${this.API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'StreamingBackend/1.0',
        },
        timeout: 10000,
      });

      const userData = response.data;

      if (!userData.id || !userData.username) {
        throw new KickAPIError(
          400,
          'INVALID_USER_DATA',
          'Invalid user data from Kick API',
          false
        );
      }

      const kickUser: KickUser = {
        id: userData.id.toString(),
        username: userData.username,
        displayName: userData.display_name || userData.username,
        avatar: userData.profile_pic,
        verified: userData.verified || false,
      };

      logger.info('Successfully fetched user info', {
        username: kickUser.username,
        verified: kickUser.verified,
      });

      return kickUser;
    } catch (error) {
      logger.error('Failed to fetch user info:', error);
      throw this.handleKickAPIError(error);
    }
  }

  /**
   * Stores OAuth tokens for a user with encryption
   * Implements Requirements 1.4, 1.5, 1.7
   */
  static async storeUserTokens(
    userId: string,
    tokens: KickTokens,
    kickUser: KickUser
  ): Promise<void> {
    if (!userId || !tokens || !kickUser) {
      throw new Error('Invalid parameters for storing user tokens');
    }

    try {
      // Check if Kick username is already linked to another user (Requirement 1.7)
      const existingUser = await prisma.user.findFirst({
        where: {
          kickUsername: kickUser.username,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new KickAPIError(
          409,
          'KICK_ACCOUNT_ALREADY_LINKED',
          'Kick account is already linked to another user',
          false
        );
      }

      // Encrypt tokens before storage (Requirement 1.5)
      const encryptedAccessToken = encryptionService.encrypt(
        tokens.accessToken
      );
      const encryptedRefreshToken = encryptionService.encrypt(
        tokens.refreshToken
      );

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

      // Store all required fields (Requirement 1.4)
      await prisma.user.update({
        where: { id: userId },
        data: {
          kickId: kickUser.id,
          kickUsername: kickUser.username,
          kickVerified: true,
          kickAccessToken: encryptedAccessToken,
          kickRefreshToken: encryptedRefreshToken,
          kickTokenExpiresAt: expiresAt,
        },
      });

      logger.info('Successfully stored user tokens', {
        userId,
        kickUsername: kickUser.username,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to store user tokens:', error);
      throw error;
    }
  }

  /**
   * Refreshes stored OAuth tokens for a user using their stored refresh token.
   * Returns true if successful, false if tokens are missing or refresh fails.
   */
  static async refreshUserTokens(userId: string): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);
      if (!tokens) return false;

      const newTokens = await this.refreshAccessToken(tokens.refreshToken);

      const encryptedAccessToken = encryptionService.encrypt(newTokens.accessToken);
      const encryptedRefreshToken = encryptionService.encrypt(newTokens.refreshToken);
      const expiresAt = new Date(Date.now() + newTokens.expiresIn * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          kickAccessToken: encryptedAccessToken,
          kickRefreshToken: encryptedRefreshToken,
          kickTokenExpiresAt: expiresAt,
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to refresh user tokens:', { userId, error });
      return false;
    }
  }

  /**
   * Retrieves and decrypts OAuth tokens for a user
   */
  static async getUserTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  } | null> {
    if (!userId) {
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          kickAccessToken: true,
          kickRefreshToken: true,
          kickTokenExpiresAt: true,
        },
      });

      if (
        !user?.kickAccessToken ||
        !user?.kickRefreshToken ||
        !user?.kickTokenExpiresAt
      ) {
        return null;
      }

      // Decrypt tokens
      const accessToken = encryptionService.decrypt(user.kickAccessToken);
      const refreshToken = encryptionService.decrypt(user.kickRefreshToken);

      return {
        accessToken,
        refreshToken,
        expiresAt: user.kickTokenExpiresAt,
      };
    } catch (error) {
      logger.error('Failed to retrieve user tokens:', error);
      return null;
    }
  }

  /**
   * Revokes and deletes all OAuth tokens for a user
   * Implements Requirements 2.4
   */
  static async revokeTokens(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required for token revocation');
    }

    try {
      // Get current tokens to revoke them with Kick
      const tokens = await this.getUserTokens(userId);

      if (tokens) {
        // Attempt to revoke tokens with Kick (best effort)
        try {
          await axios.post(
            `${this.OAUTH_BASE_URL}/revoke`,
            {
              token: tokens.accessToken,
              client_id: this.CLIENT_ID,
              client_secret: this.CLIENT_SECRET,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'StreamingBackend/1.0',
              },
              timeout: 5000,
            }
          );
        } catch (revokeError) {
          // Log but don't fail - we'll still clear local tokens
          logger.warn('Failed to revoke tokens with Kick:', revokeError);
        }
      }

      // Clear tokens from database (Requirement 2.4)
      await prisma.user.update({
        where: { id: userId },
        data: {
          kickId: null,
          kickUsername: null,
          kickAccessToken: null,
          kickRefreshToken: null,
          kickTokenExpiresAt: null,
        },
      });

      logger.info('Successfully revoked user tokens', { userId });
    } catch (error) {
      logger.error('Failed to revoke user tokens:', error);
      throw error;
    }
  }

  /**
   * Generates a secure state parameter for OAuth flow
   * Implements Requirements 15.7
   */
  static generateSecureState(): string {
    return encryptionService.generateSecureState();
  }

  /**
   * Handles Kick API errors with proper error classification
   * Implements Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
   */
  private static handleKickAPIError(error: any): KickAPIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const data = axiosError.response?.data as any;

      // Log all Kick API errors with sufficient detail for debugging (Requirement 14.7)
      logger.error('Kick API Error Details', {
        status,
        statusText: axiosError.response?.statusText,
        data,
        url: axiosError.config?.url,
        method: axiosError.config?.method,
      });

      switch (status) {
        case 400:
          return new KickAPIError(
            400,
            'BAD_REQUEST',
            data?.error_description || 'Invalid request parameters',
            false
          );
        case 401:
          // Token expired or invalid - retryable with refresh (Requirement 14.2)
          return new KickAPIError(
            401,
            'UNAUTHORIZED',
            'Token expired or invalid',
            true
          );
        case 403:
          return new KickAPIError(403, 'FORBIDDEN', 'Access forbidden', false);
        case 429:
          // Rate limit exceeded - retryable (Requirement 14.5)
          return new KickAPIError(
            429,
            'RATE_LIMITED',
            'Rate limit exceeded',
            true
          );
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors - retryable (Requirement 14.6)
          return new KickAPIError(
            status,
            'SERVER_ERROR',
            'Kick server error',
            true
          );
        default:
          return new KickAPIError(
            status,
            'UNKNOWN',
            data?.error_description || axiosError.message,
            false
          );
      }
    }

    // Network errors - retryable (Requirement 14.1)
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND'
    ) {
      return new KickAPIError(
        500,
        'NETWORK_ERROR',
        error.message || 'Network error',
        true
      );
    }

    return new KickAPIError(
      500,
      'UNKNOWN',
      error.message || 'Unknown error',
      false
    );
  }
}

export default KickOAuthService;
