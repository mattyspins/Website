import { api } from "../api";
import type {
  GuessTheBalanceGame,
  GuessSubmission,
  CreateGameDTO,
  CompleteGameDTO,
  SubmitGuessDTO,
  GameResponse,
  GamesResponse,
  GuessResponse,
  GuessesResponse,
  DeleteGameResponse,
  GuessTheBalanceStatus,
} from "@/types/guessTheBalance";

/**
 * Guess the Balance API Client
 */
export const guessTheBalanceApi = {
  // ==================== ADMIN METHODS ====================

  /**
   * Create a new game
   * @param data Game creation data
   * @returns Created game
   */
  async createGame(data: CreateGameDTO): Promise<GuessTheBalanceGame> {
    console.log("[API] Creating game with data:", data);
    const response: GameResponse = await api.post(
      "/api/guess-the-balance/admin",
      data,
    );
    console.log("[API] Received response:", response);

    if (!response || typeof response !== "object") {
      console.error("[API] Invalid response type:", typeof response);
      throw new Error("Invalid response from server");
    }

    if (!response.game) {
      console.error("[API] Response missing game field:", response);
      throw new Error("Server response missing game data");
    }

    console.log("[API] Returning game:", response.game);
    return response.game;
  },

  /**
   * Get all games (admin view with filters)
   * @param status Optional status filter
   * @returns List of games
   */
  async getAllGames(
    status?: GuessTheBalanceStatus,
  ): Promise<GuessTheBalanceGame[]> {
    const url = status
      ? `/api/guess-the-balance/admin?status=${status}`
      : "/api/guess-the-balance/admin";
    const response: GamesResponse = await api.get(url);
    return response.games;
  },

  /**
   * Open guessing for a game
   * @param gameId Game ID
   * @returns Updated game
   */
  async openGuessing(gameId: string): Promise<GuessTheBalanceGame> {
    const response: GameResponse = await api.patch(
      `/api/guess-the-balance/admin/${gameId}/open`,
    );
    return response.game;
  },

  /**
   * Close guessing for a game
   * @param gameId Game ID
   * @returns Updated game
   */
  async closeGuessing(gameId: string): Promise<GuessTheBalanceGame> {
    const response: GameResponse = await api.patch(
      `/api/guess-the-balance/admin/${gameId}/close`,
    );
    return response.game;
  },

  /**
   * Complete game and draw winner
   * @param gameId Game ID
   * @param data Final balance and optional reward
   * @returns Completed game with winner info
   */
  async completeGame(
    gameId: string,
    data: CompleteGameDTO,
  ): Promise<GuessTheBalanceGame> {
    const response: GameResponse = await api.post(
      `/api/guess-the-balance/admin/${gameId}/complete`,
      data,
    );
    return response.game;
  },

  /**
   * Get all guesses for a game (admin only)
   * @param gameId Game ID
   * @returns List of all guesses with user info
   */
  async getAllGuesses(gameId: string): Promise<{
    gameId: string;
    totalGuesses: number;
    guesses: GuessSubmission[];
  }> {
    const response: GuessesResponse = await api.get(
      `/api/guess-the-balance/admin/${gameId}/guesses`,
    );
    return {
      gameId: response.gameId,
      totalGuesses: response.totalGuesses,
      guesses: response.guesses,
    };
  },

  /**
   * Delete a game
   * @param gameId Game ID
   * @returns Success message
   */
  async deleteGame(gameId: string): Promise<string> {
    const response: DeleteGameResponse = await api.delete(
      `/api/guess-the-balance/admin/${gameId}`,
    );
    return response.message;
  },

  // ==================== USER METHODS ====================

  /**
   * Get active games (OPEN status)
   * @returns List of active games
   */
  async getActiveGames(): Promise<GuessTheBalanceGame[]> {
    const response: GamesResponse = await api.get("/api/guess-the-balance");
    return response.games;
  },

  /**
   * Get completed games
   * @returns List of completed games with winner info
   */
  async getCompletedGames(): Promise<GuessTheBalanceGame[]> {
    const response: GamesResponse = await api.get(
      "/api/guess-the-balance/completed",
    );
    return response.games;
  },

  /**
   * Get game details
   * @param gameId Game ID
   * @returns Game details
   */
  async getGameDetails(gameId: string): Promise<GuessTheBalanceGame> {
    const response: GameResponse = await api.get(
      `/api/guess-the-balance/${gameId}`,
    );
    return response.game;
  },

  /**
   * Submit or update a guess
   * @param gameId Game ID
   * @param data Guess amount
   * @returns Submitted/updated guess
   */
  async submitGuess(
    gameId: string,
    data: SubmitGuessDTO,
  ): Promise<GuessSubmission> {
    const response: GuessResponse = await api.post(
      `/api/guess-the-balance/${gameId}/guess`,
      data,
    );
    return response.guess;
  },

  /**
   * Get current user's guess for a game
   * @param gameId Game ID
   * @returns User's guess or null if not submitted
   */
  async getUserGuess(gameId: string): Promise<GuessSubmission | null> {
    try {
      const response: GuessResponse = await api.get(
        `/api/guess-the-balance/${gameId}/my-guess`,
      );
      return response.guess;
    } catch (error: any) {
      // Return null if no guess found (404)
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
