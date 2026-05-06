import { GuessTheBalanceStatus } from '@prisma/client';

// DTOs (Data Transfer Objects)

export interface CreateGameDTO {
  title?: string;
  description?: string;
  startingBalance: number;
  numberOfBonuses: number;
  breakEvenMultiplier: number;
}

export interface CompleteGameDTO {
  finalBalance: number;
  winnerReward?: number;
}

export interface SubmitGuessDTO {
  guessAmount: number;
}

// Response Types

export interface GameResponse {
  id: string;
  title?: string;
  description?: string;
  startingBalance: number;
  numberOfBonuses: number;
  breakEvenMultiplier: number;
  finalBalance?: number;
  status: GuessTheBalanceStatus;
  winnerId?: string;
  winnerGuess?: number;
  winnerReward?: number;
  createdBy: string;
  createdAt: Date;
  openedAt?: Date;
  closedAt?: Date;
  completedAt?: Date;
  totalGuesses?: number;
  userHasGuessed?: boolean;
}

export interface GameWithWinnerResponse extends GameResponse {
  winner?: {
    id: string;
    displayName: string;
    avatar?: string;
    guessAmount: number;
    difference: number;
    reward: number;
  };
}

export interface GuessResponse {
  id: string;
  gameId: string;
  userId: string;
  guessAmount: number;
  submittedAt: Date;
  updatedAt: Date;
}

export interface GuessWithUserResponse extends GuessResponse {
  user: {
    id: string;
    displayName: string;
    avatar?: string;
  };
}

export interface WinnerInfo {
  userId: string;
  guessAmount: number;
  difference: number;
  isPerfect: boolean;
}

// Service Types

export interface GameFilters {
  status?: GuessTheBalanceStatus;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

export interface GameStats {
  totalGames: number;
  activeGames: number;
  completedGames: number;
  totalGuesses: number;
}
