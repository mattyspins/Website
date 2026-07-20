export enum SlotWorldCupStatus {
  NOMINATION = "NOMINATION",
  BRACKET_SET = "BRACKET_SET",
  PREDICTIONS_OPEN = "PREDICTIONS_OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum SlotWorldCupSeeding {
  RANDOM = "RANDOM",
  POPULARITY = "POPULARITY",
}

export interface SlotWorldCupSlot {
  id: string;
  tournamentId: string;
  slotName: string;
  provider: string | null;
  imageUrl: string | null;
  seed: number;
  votes: number;
  eliminatedRound: number | null;
}

export interface SlotWorldCupMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  slotAId: string | null;
  slotBId: string | null;
  winnerId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: "A" | "B" | null;
  betAmountA: string | null;
  payoutAmountA: string | null;
  multiplierA: string | null;
  betAmountB: string | null;
  payoutAmountB: string | null;
  multiplierB: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface SlotWorldCupNominationRanking {
  rank: number;
  /** normalizedName — the identifier approve/reject act on. */
  key: string;
  slotName: string;
  /** Kick username of whoever nominated it first. */
  by: string;
  votes: number;
}

export interface SlotWorldCup {
  id: string;
  title: string;
  size: number;
  status: SlotWorldCupStatus;
  nominationsOpen: boolean;
  nominationCommand: string;
  /** How matchups are played on stream (Bonus Buy / 100 Spins / …). */
  matchRule: string;
  seeding: SlotWorldCupSeeding;
  currentRound: number;
  totalRounds: number;
  scoringConfig: {
    stagePoints: number[];
    upsetThresholdPercent: number;
    upsetBonusPoints: number;
    perfectBracketBonus: number;
  };
  rewardConfig: { ranks: Record<string, number> };
  championSlotId: string | null;
  runnerUpSlotId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // Both are optional because the API returns different shapes: the list
  // endpoint (getAll) includes only `slots`, while `getById` and the socket
  // payload include `matches` too. Declaring them as always-present is what let
  // `tournament.matches.filter(...)` compile and then crash both the viewer and
  // admin pages at runtime — keep them optional so the compiler forces a guard.
  slots?: SlotWorldCupSlot[];
  matches?: SlotWorldCupMatch[];
  nominations?: unknown[];
}

export interface SlotWorldCupLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  correctPicks: number;
  accuracy: number;
}

export interface SlotWorldCupPrediction {
  id: string;
  tournamentId: string;
  userId: string;
  displayName: string;
  picks: Record<string, string>;
  championPickId: string | null;
  score: number;
  correctPicks: number;
  accuracy: number;
  submittedAt: string;
}
