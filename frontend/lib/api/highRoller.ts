import { api } from "@/lib/api";

export type HighRollerPrediction = "OVER" | "UNDER";

export interface HighRollerUser {
  id: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
}

export interface HighRollerPlayer {
  id: string;
  sessionId: string;
  userId: string;
  kickUsername: string;
  currentStreak: number;
  bestStreak: number;
  roundsPlayed: number;
  correctCount: number;
  accuracy: number;
  currentPrediction: HighRollerPrediction | null;
  active: boolean;
  joinedAt: string;
  leftAt: string | null;
  user: HighRollerUser;
}

export interface HighRollerRound {
  id: string;
  sessionId: string;
  roundNumber: number;
  threshold: string;
  slotResult: string;
  winningSide: HighRollerPrediction;
  numberOver: number;
  numberUnder: number;
  resolvedAt: string;
}

export interface HighRollerSession {
  id: string;
  title: string | null;
  threshold: string;
  status: "OPEN" | "CLOSED";
  paused: boolean;
  roundLocked: boolean;
  roundNumber: number;
  finalRound: boolean;
  treatMissedAsWrong: boolean;
  joinKeyword: string;
  leaveKeyword: string;
  overKeyword: string;
  underKeyword: string;
  suggestKeyword: string | null;
  createdAt: string;
  closedAt: string | null;
  players: HighRollerPlayer[];
  rounds: HighRollerRound[];
}

export interface HighRollerRoundResult {
  roundNumber: number;
  threshold: number;
  slotResult: number;
  winningSide: HighRollerPrediction;
  numberOver: number;
  numberUnder: number;
  milestonesHit: Array<{ playerId: string; kickUsername: string; streak: number }>;
  newStreakLeader: { kickUsername: string; streakAfter: number } | null;
  perfectRound: boolean;
  houseWins: boolean;
}

export interface HighRollerHallOfFame {
  champions: Array<{ kickUsername: string; bestStreak: number }>;
  longestStreak: number;
  mostAccurate: Array<{ kickUsername: string; accuracy: number }>;
  mostCorrectPredictions: Array<{ kickUsername: string; correctCount: number }>;
  totalRoundsPlayed: number;
  biggestComeback: { kickUsername: string; streak: number } | null;
  mvp: { kickUsername: string; score: number } | null;
}

export interface CreateHighRollerParams {
  title?: string;
  threshold: number;
  joinKeyword?: string;
  leaveKeyword?: string;
  overKeyword?: string;
  underKeyword?: string;
  suggestKeyword?: string;
  treatMissedAsWrong?: boolean;
}

export const highRollerApi = {
  getAll: () => api.get("/api/high-roller").then((d) => d.sessions as HighRollerSession[]),
  getActive: () => api.get("/api/high-roller/active").then((d) => d.session as HighRollerSession | null),
  create: (params: CreateHighRollerParams) =>
    api.post("/api/high-roller", params).then((d) => d.session as HighRollerSession),
  addPlayer: (id: string, kickUsername: string) =>
    api.post(`/api/high-roller/${id}/add-player`, { kickUsername }).then((d) => d.session as HighRollerSession),
  removePlayer: (playerId: string) =>
    api.delete(`/api/high-roller/players/${playerId}`).then((d) => d.session as HighRollerSession),
  lockPredictions: (id: string) =>
    api.post(`/api/high-roller/${id}/lock`, {}).then((d) => d.session as HighRollerSession),
  resetRound: (id: string) =>
    api.post(`/api/high-roller/${id}/reset-round`, {}).then((d) => d.session as HighRollerSession),
  resolveRound: (id: string, slotResult: number) =>
    api
      .post(`/api/high-roller/${id}/resolve`, { slotResult })
      .then((d) => ({ session: d.session as HighRollerSession, roundResult: d.roundResult as HighRollerRoundResult })),
  changeThreshold: (id: string, threshold: number) =>
    api.post(`/api/high-roller/${id}/threshold`, { threshold }).then((d) => d.session as HighRollerSession),
  pause: (id: string) => api.post(`/api/high-roller/${id}/pause`, {}).then((d) => d.session as HighRollerSession),
  resume: (id: string) => api.post(`/api/high-roller/${id}/resume`, {}).then((d) => d.session as HighRollerSession),
  setFinalRound: (id: string, finalRound: boolean) =>
    api.post(`/api/high-roller/${id}/final-round`, { finalRound }).then((d) => d.session as HighRollerSession),
  endGame: (id: string) =>
    api
      .post(`/api/high-roller/${id}/end`, {})
      .then((d) => ({ session: d.session as HighRollerSession, hallOfFame: d.hallOfFame as HighRollerHallOfFame })),
  drawSuggestion: (id: string, pool: "joined" | "suggested", excludePrevious: boolean) =>
    api
      .post(`/api/high-roller/${id}/draw-suggestion`, { pool, excludePrevious })
      .then((d) => ({ session: d.session as HighRollerSession, winner: d.winner as { kickUsername: string; userId: string } })),
  delete: (id: string) => api.delete(`/api/high-roller/${id}`),
};
