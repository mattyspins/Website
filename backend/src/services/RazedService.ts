import axios, { AxiosError } from 'axios';
import { logger } from '@/utils/logger';

const RAZED_API_BASE_URL = process.env['RAZED_API_BASE_URL'] || 'https://api.razed.com/player/api/v1';
const RAZED_REFERRAL_KEY = process.env['RAZED_REFERRAL_KEY'] || '';
const RAZED_REFERRAL_CODE = process.env['RAZED_REFERRAL_CODE'] || 'Mattyspins';
const PAGE_SIZE = 100;

export class RazedAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'RazedAPIError';
  }
}

interface RazedReferralRow {
  username: string;
  referred_by_code: string;
  wagered: string;
}

interface RazedReferralPage {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  data: RazedReferralRow[];
}

export class RazedService {
  static isConfigured(): boolean {
    return RAZED_REFERRAL_KEY.length > 0;
  }

  private static async fetchPage(from: string, to: string, page: number): Promise<RazedReferralPage> {
    try {
      const response = await axios.get<RazedReferralPage>(`${RAZED_API_BASE_URL}/referrals/leaderboard`, {
        headers: { 'X-Referral-Key': RAZED_REFERRAL_KEY },
        params: { referral_code: RAZED_REFERRAL_CODE, from, to, top: PAGE_SIZE, page },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      throw RazedService.handleError(error);
    }
  }

  /** Fetches every referred player's wagered amount for an inclusive date range (max 45 days per Razed's API). */
  static async fetchAllReferrals(from: string, to: string): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const first = await RazedService.fetchPage(from, to, 1);
    for (const row of first.data) {
      result.set(row.username.toLowerCase(), parseFloat(row.wagered));
    }

    for (let page = 2; page <= first.last_page; page++) {
      const next = await RazedService.fetchPage(from, to, page);
      for (const row of next.data) {
        result.set(row.username.toLowerCase(), parseFloat(row.wagered));
      }
    }

    return result;
  }

  private static handleError(error: unknown): RazedAPIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status || 500;
      logger.error('Razed API error', {
        status,
        data: axiosError.response?.data,
        url: axiosError.config?.url,
        params: axiosError.config?.params,
      });
      const message = axiosError.response?.data?.message || axiosError.message;
      const retryable = status >= 500 || status === 429;
      return new RazedAPIError(status, message, retryable);
    }
    logger.error('Razed API unexpected error', { error });
    return new RazedAPIError(500, 'Unexpected error calling Razed API', true);
  }
}
