import { api } from "@/lib/api";

export interface MonthlyStandingRow {
  position: number;
  userId: string | null;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
  wagered: string;
  points: number | null;
  linked: boolean;
}

export interface MonthlyHistoryWinner {
  position: number;
  userId: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
  wagered: string;
  pointsAwarded: number;
}

export interface MonthlyHistoryEntry {
  monthStart: string;
  winners: MonthlyHistoryWinner[];
}

export interface AdminWagerRow {
  id: string;
  displayName: string;
  kickUsername: string | null;
  rainbetUsername: string | null;
  rainbetVerified: boolean;
  weeklyWagered: string;
  monthlyWagered: string;
  totalWagered: string;
}

export interface MonthlyPrize {
  id: string;
  position: number;
  points: number;
}

export interface AllWagererRow {
  razedUsername: string;
  linked: boolean;
  userId: string | null;
  displayName: string | null;
  kickUsername: string | null;
  verified: boolean;
  weeklyWagered: string;
  monthlyWagered: string;
  totalWagered: string;
}

export const wagerLeaderboardApi = {
  getMonthly: () => api.get("/api/wager-leaderboard/monthly").then((d) => d.standings as MonthlyStandingRow[]),
  getMonthlyHistory: () =>
    api.get("/api/wager-leaderboard/monthly/history").then((d) => d.history as MonthlyHistoryEntry[]),
  getAdminWagers: () => api.get("/api/wager-leaderboard/admin/wagers").then((d) => d.users as AdminWagerRow[]),
  getAllWagerers: () =>
    api.get("/api/wager-leaderboard/admin/all-wagerers").then((d) => d.wagerers as AllWagererRow[]),
  getPrizes: () => api.get("/api/wager-leaderboard/admin/prizes").then((d) => d.prizes as MonthlyPrize[]),
  setPrizes: (prizes: { position: number; points: number }[]) =>
    api.put("/api/wager-leaderboard/admin/prizes", { prizes }).then((d) => d.prizes as MonthlyPrize[]),
  resync: () => api.post("/api/wager-leaderboard/admin/resync", {}),
};
