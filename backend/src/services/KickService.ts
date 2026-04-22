import axios from 'axios';
import { validateEnv } from '@/config/env';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { RedisService } from '@/config/redis';

const env = validateEnv();

export interface KickUser {
  id: string;
  username: string;
  avatar?: string;
  verified?: boolean;
  follower_count?: number;
  following_count?: number;
}

export interface KickStreamInfo {
  id: string;
  title: string;
  is_live: boolean;
  viewer_count: number;
  started_at?: string;
  thumbnail?: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface ViewingSession {
  userId: string;
  streamId: string;
  startTime: Date;
  isActive: boolean;
}

export class KickService {
  private static readonly KICK_API_BASE = env.KICK_API_BASE_URL;
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly STREAM_STATUS_CACHE_TTL = 60; // 1 minute

  // Get user information from Kick API
  static async getUserInfo(username: string): Promise<KickUser | null> {
    try {
      const cacheKey = `kick:user:${username.toLowerCase()}`;

      // Try cache first
      const cached = await RedisService.getJSON<KickUser>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(
        `${this.KICK_API_BASE}/users/${username}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'StreamingBackend/1.0',
          },
        }
      );

      if (response.status === 404) {
        return null;
      }

      const userData = response.data;
      const kickUser: KickUser = {
        id: userData.id?.toString() || userData.user_id?.toString(),
        username: userData.username,
        avatar: userData.profile_pic,
        verified: userData.verified || false,
        follower_count: userData.follower_count,
        following_count: userData.following_count,
      };

      // Cache the result
      await RedisService.setJSON(cacheKey, kickUser, this.CACHE_TTL);

      logger.info(`Kick user info fetched: ${username}`);
      return kickUser;
    } catch (error) {
      logger.error(`Kick user info fetch failed for ${username}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        } else if (error.response?.status === 429) {
          throw createError.tooManyRequests('Kick API rate limit exceeded');
        }
      }

      // Don't throw error for user lookup failures
      return null;
    }
  }

  // Get stream information for a channel
  static async getStreamInfo(
    channelName: string
  ): Promise<KickStreamInfo | null> {
    try {
      const cacheKey = `kick:stream:${channelName.toLowerCase()}`;

      // Try cache first
      const cached = await RedisService.getJSON<KickStreamInfo>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(
        `${this.KICK_API_BASE}/channels/${channelName}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'StreamingBackend/1.0',
          },
        }
      );

      if (response.status === 404) {
        return null;
      }

      const channelData = response.data;
      const livestream = channelData.livestream;

      const streamInfo: KickStreamInfo = {
        id: livestream?.id?.toString() || channelData.id?.toString(),
        title:
          livestream?.session_title ||
          channelData.user?.username ||
          'Untitled Stream',
        is_live: !!livestream && livestream.is_live,
        viewer_count: livestream?.viewer_count || 0,
        started_at: livestream?.start_time,
        thumbnail: livestream?.thumbnail,
        category: livestream?.category
          ? {
              id: livestream.category.id?.toString(),
              name: livestream.category.name,
            }
          : undefined,
      };

      // Cache with shorter TTL for live status
      await RedisService.setJSON(
        cacheKey,
        streamInfo,
        this.STREAM_STATUS_CACHE_TTL
      );

      return streamInfo;
    } catch (error) {
      logger.error(`Kick stream info fetch failed for ${channelName}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        } else if (error.response?.status === 429) {
          logger.warn('Kick API rate limit exceeded for stream info');
          // Return cached data if available, even if expired
          const cacheKey = `kick:stream:${channelName.toLowerCase()}`;
          return await RedisService.getJSON<KickStreamInfo>(cacheKey);
        }
      }

      return null;
    }
  }

  // Check if MattySpins is currently live
  static async isMattySpinsLive(): Promise<boolean> {
    try {
      const streamInfo = await this.getStreamInfo(env.KICK_CHANNEL_NAME);
      return streamInfo?.is_live || false;
    } catch (error) {
      logger.error('Error checking MattySpins live status:', error);
      return false;
    }
  }

  // Get MattySpins stream information
  static async getMattySpinsStreamInfo(): Promise<KickStreamInfo | null> {
    return await this.getStreamInfo(env.KICK_CHANNEL_NAME);
  }

  // Start viewing session tracking
  static async startViewingSession(
    userId: string,
    streamId: string
  ): Promise<ViewingSession> {
    const session: ViewingSession = {
      userId,
      streamId,
      startTime: new Date(),
      isActive: true,
    };

    const cacheKey = `viewing:${userId}:${streamId}`;
    await RedisService.setJSON(cacheKey, session, 3600); // 1 hour

    logger.info(`Viewing session started: ${userId} -> ${streamId}`);
    return session;
  }

  // End viewing session and calculate points
  static async endViewingSession(
    userId: string,
    streamId: string
  ): Promise<{ durationMinutes: number; pointsEarned: number }> {
    try {
      const cacheKey = `viewing:${userId}:${streamId}`;
      const session = await RedisService.getJSON<ViewingSession>(cacheKey);

      if (!session || !session.isActive) {
        return { durationMinutes: 0, pointsEarned: 0 };
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - session.startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      // Calculate points (minimum 1 minute to earn points)
      const pointsEarned =
        durationMinutes >= 1
          ? durationMinutes * env.POINTS_PER_MINUTE_VIEWING
          : 0;

      // Remove session from cache
      await RedisService.del(cacheKey);

      logger.info(
        `Viewing session ended: ${userId} -> ${durationMinutes} minutes, ${pointsEarned} points`
      );

      return { durationMinutes, pointsEarned };
    } catch (error) {
      logger.error('Error ending viewing session:', error);
      return { durationMinutes: 0, pointsEarned: 0 };
    }
  }

  // Get active viewing session
  static async getActiveViewingSession(
    userId: string,
    streamId: string
  ): Promise<ViewingSession | null> {
    try {
      const cacheKey = `viewing:${userId}:${streamId}`;
      return await RedisService.getJSON<ViewingSession>(cacheKey);
    } catch (error) {
      logger.error('Error getting viewing session:', error);
      return null;
    }
  }

  // Validate user presence in stream (anti-abuse measure)
  static async validateUserPresence(
    userId: string,
    streamId: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would check if the user is actually watching
      // For now, we'll implement basic validation by checking if session exists
      const session = await this.getActiveViewingSession(userId, streamId);

      if (!session) {
        return false;
      }

      // Check if session is not too old (max 10 minutes without activity)
      const now = new Date();
      const sessionAge = now.getTime() - new Date(session.startTime).getTime();
      const maxSessionAge = 10 * 60 * 1000; // 10 minutes

      return sessionAge <= maxSessionAge;
    } catch (error) {
      logger.error('Error validating user presence:', error);
      return false;
    }
  }

  // Update viewing session activity (heartbeat)
  static async updateViewingActivity(
    userId: string,
    streamId: string
  ): Promise<boolean> {
    try {
      const cacheKey = `viewing:${userId}:${streamId}`;
      const session = await RedisService.getJSON<ViewingSession>(cacheKey);

      if (!session) {
        return false;
      }

      // Update session with current timestamp
      session.startTime = new Date(); // Reset start time for activity tracking
      await RedisService.setJSON(cacheKey, session, 3600);

      return true;
    } catch (error) {
      logger.error('Error updating viewing activity:', error);
      return false;
    }
  }

  // Get stream statistics
  static async getStreamStatistics(channelName: string): Promise<{
    totalViewers: number;
    peakViewers: number;
    averageViewTime: number;
  } | null> {
    try {
      // This would typically come from Kick API or our own tracking
      // For now, return mock data
      const streamInfo = await this.getStreamInfo(channelName);

      if (!streamInfo) {
        return null;
      }

      return {
        totalViewers: streamInfo.viewer_count,
        peakViewers: Math.floor(streamInfo.viewer_count * 1.5), // Mock peak
        averageViewTime: 45, // Mock average in minutes
      };
    } catch (error) {
      logger.error('Error getting stream statistics:', error);
      return null;
    }
  }

  // Clear all caches for a channel (useful for testing or manual refresh)
  static async clearChannelCache(channelName: string): Promise<void> {
    try {
      const keys = [
        `kick:stream:${channelName.toLowerCase()}`,
        `kick:user:${channelName.toLowerCase()}`,
      ];

      for (const key of keys) {
        await RedisService.del(key);
      }

      logger.info(`Cleared Kick cache for channel: ${channelName}`);
    } catch (error) {
      logger.error('Error clearing channel cache:', error);
    }
  }
}
