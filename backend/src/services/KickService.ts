// Stub KickService - Kick integration disabled
// This file provides stub methods to prevent build errors

export class KickService {
  static async isMattySpinsLive(): Promise<boolean> {
    // Always return false since Kick integration is disabled
    return false;
  }

  static async getActiveViewingSession(
    userId: string,
    streamId: string
  ): Promise<any> {
    return null;
  }

  static async startViewingSession(
    userId: string,
    streamId: string
  ): Promise<any> {
    throw new Error('Kick integration is disabled');
  }

  static async endViewingSession(
    userId: string,
    streamId: string
  ): Promise<any> {
    throw new Error('Kick integration is disabled');
  }

  static async validateUserPresence(
    userId: string,
    streamId: string
  ): Promise<boolean> {
    return false;
  }

  static async updateViewingActivity(
    userId: string,
    streamId: string
  ): Promise<any> {
    return null;
  }

  static async getMattySpinsStreamInfo(): Promise<any> {
    return null;
  }
}
