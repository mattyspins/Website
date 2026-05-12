// Guess the Balance Types

export enum GuessTheBalanceStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  COMPLETED = "COMPLETED",
}

export interface GuessTheBalanceGame {
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
  createdAt: string;
  openedAt?: string;
  closedAt?: string;
  completedAt?: string;
  totalGuesses?: number;
  userHasGuessed?: boolean;
  userGuessAmount?: number;
  winner?: WinnerInfo;
}

export interface WinnerInfo {
  id: string;
  displayName: string;
  avatar: string;
  guessAmount: number;
  difference: number;
  reward: number;
}

export interface GuessSubmission {
  id: string;
  gameId: string;
  userId: string;
  guessAmount: number;
  submittedAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    avatar: string;
  };
}

// DTOs
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

// API Response Types
export interface GameResponse {
  success: boolean;
  game: GuessTheBalanceGame;
}

export interface GamesResponse {
  success: boolean;
  games: GuessTheBalanceGame[];
}

export interface GuessResponse {
  success: boolean;
  guess: GuessSubmission;
}

export interface GuessesResponse {
  success: boolean;
  gameId: string;
  totalGuesses: number;
  guesses: GuessSubmission[];
}

export interface DeleteGameResponse {
  success: boolean;
  message: string;
}
