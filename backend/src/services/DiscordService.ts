import axios from 'axios';
import { validateEnv } from '@/config/env';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { DiscordUser } from '@/services/AuthService';

const env = validateEnv();

export interface DiscordOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export class DiscordService {
  private static readonly DISCORD_API_BASE = 'https://discord.com/api/v10';
  private static readonly OAUTH_BASE = 'https://discord.com/api/oauth2';

  // Generate Discord OAuth URL
  static generateOAuthURL(state?: string): string {
    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email guilds', // Added 'guilds' to check server membership
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.OAUTH_BASE}/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  static async exchangeCodeForTokens(
    code: string
  ): Promise<DiscordOAuthTokens> {
    try {
      const response = await axios.post(
        `${this.OAUTH_BASE}/token`,
        new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: env.DISCORD_REDIRECT_URI,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Discord token exchange failed:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw createError.badRequest('Invalid authorization code');
        } else if (error.response?.status === 401) {
          throw createError.unauthorized('Invalid client credentials');
        }
      }

      throw createError.internal(
        'Failed to exchange Discord authorization code'
      );
    }
  }

  // Get user information from Discord API
  static async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await axios.get(`${this.DISCORD_API_BASE}/users/@me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      const userData = response.data;

      return {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        email: userData.email,
        verified: userData.verified,
      };
    } catch (error) {
      logger.error('Discord user info fetch failed:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw createError.unauthorized('Invalid Discord access token');
        } else if (error.response?.status === 429) {
          throw createError.tooManyRequests('Discord API rate limit exceeded');
        }
      }

      throw createError.internal('Failed to fetch Discord user information');
    }
  }

  // Refresh Discord access token
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<DiscordOAuthTokens> {
    try {
      const response = await axios.post(
        `${this.OAUTH_BASE}/token`,
        new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Discord token refresh failed:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw createError.badRequest('Invalid refresh token');
        }
      }

      throw createError.internal('Failed to refresh Discord access token');
    }
  }

  // Send Discord notification (requires bot token)
  static async sendDirectMessage(
    userId: string,
    message: string
  ): Promise<boolean> {
    try {
      // First, create a DM channel
      const dmResponse = await axios.post(
        `${this.DISCORD_API_BASE}/users/@me/channels`,
        {
          recipient_id: userId,
        },
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const channelId = dmResponse.data.id;

      // Send message to the DM channel
      await axios.post(
        `${this.DISCORD_API_BASE}/channels/${channelId}/messages`,
        {
          content: message,
        },
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info(`Discord DM sent to user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Discord DM send failed:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          logger.warn(
            `Cannot send DM to user ${userId}: DMs disabled or not mutual server`
          );
        } else if (error.response?.status === 429) {
          logger.warn('Discord API rate limit exceeded for DM');
        }
      }

      return false;
    }
  }

  // Send message to a Discord channel (requires bot to be in the server)
  static async sendChannelMessage(
    channelId: string,
    message: string,
    embed?: any
  ): Promise<boolean> {
    try {
      const payload: any = {
        content: message,
      };

      if (embed) {
        payload.embeds = [embed];
      }

      await axios.post(
        `${this.DISCORD_API_BASE}/channels/${channelId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info(`Discord channel message sent to ${channelId}`);
      return true;
    } catch (error) {
      logger.error('Discord channel message send failed:', error);
      return false;
    }
  }

  // Create Discord embed for notifications
  static createEmbed(
    title: string,
    description: string,
    color: number = 0x00ff00,
    fields?: Array<{ name: string; value: string; inline?: boolean }>
  ): any {
    const embed: any = {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
    };

    if (fields && fields.length > 0) {
      embed.fields = fields;
    }

    return embed;
  }

  // Validate Discord webhook URL
  static isValidWebhookURL(url: string): boolean {
    const webhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    return webhookRegex.test(url);
  }

  // Send webhook message
  static async sendWebhookMessage(
    webhookUrl: string,
    message: string,
    embed?: any
  ): Promise<boolean> {
    try {
      if (!this.isValidWebhookURL(webhookUrl)) {
        throw createError.badRequest('Invalid Discord webhook URL');
      }

      const payload: any = {
        content: message,
      };

      if (embed) {
        payload.embeds = [embed];
      }

      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      logger.info('Discord webhook message sent');
      return true;
    } catch (error) {
      logger.error('Discord webhook send failed:', error);
      return false;
    }
  }

  // Check if user is a member of a specific Discord server
  static async checkServerMembership(
    accessToken: string,
    guildId: string
  ): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.DISCORD_API_BASE}/users/@me/guilds`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        }
      );

      const guilds = response.data;
      const isMember = guilds.some((guild: any) => guild.id === guildId);

      logger.info(
        `Discord server membership check: ${isMember ? 'Member' : 'Not a member'}`
      );

      return isMember;
    } catch (error) {
      logger.error('Discord server membership check failed:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw createError.unauthorized('Invalid Discord access token');
        } else if (error.response?.status === 429) {
          throw createError.tooManyRequests('Discord API rate limit exceeded');
        }
      }

      throw createError.internal('Failed to check Discord server membership');
    }
  }

  // Get user's roles in a specific server (requires bot)
  static async getUserServerRoles(
    guildId: string,
    userId: string
  ): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          },
          timeout: 10000,
        }
      );

      return response.data.roles || [];
    } catch (error) {
      logger.error('Discord user roles fetch failed:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.warn(`User ${userId} not found in guild ${guildId}`);
          return [];
        } else if (error.response?.status === 403) {
          logger.warn('Bot does not have permission to access guild members');
        }
      }

      return [];
    }
  }
}
