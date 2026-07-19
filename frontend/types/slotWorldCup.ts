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
  stats: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
}

export interface SlotWorldCupNominationRanking {
  rank: number;
  slotName: string;
  votes: number;
}

export interface SlotWorldCup {
  id: string;
  title: string;
  size: number;
  status: SlotWorldCupStatus;
  nominationsOpen: boolean;
  seeding: SlotWorldCupSeeding;
  currentRound: number;
  totalRounds: number;
  scoringConfig: {
    stagePoints: number[];
    championBonus: number;
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
  slots: SlotWorldCupSlot[];
  matches: SlotWorldCupMatch[];
  nominations?: unknown[];
}

export interface SlotWorldCupLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  correctPicks: number;
  accuracy: number;
  championPickId: string | null;
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

export interface SlotWorldCupMatchStat {
  slotId: string;
  count: number;
  percent: number;
}
