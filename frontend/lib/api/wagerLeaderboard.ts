import { api } from "@/lib/api";

export interface RaceStandingRow {
  position: number;
  userId: string | null;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
  wagered: string;
  prizeAmount: number | null;
  linked: boolean;
}

export interface RacePrize {
  position: number;
  amount: number;
}

export type RacePhase = "upcoming" | "active" | "ended";
export type RaceType = "WEEKLY" | "MONTHLY";

export interface ActiveRace {
  id: string;
  type: RaceType;
  startDate: string;
  endDate: string;
  totalPrizePool: number;
  phase: RacePhase;
  prizes: RacePrize[];
  standings: RaceStandingRow[];
}

export interface RaceHistoryWinner {
  position: number;
  userId: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
  wagered: string;
  prizeAmount: number;
}

export interface RaceHistoryEntry {
  id: string;
  type: RaceType;
  startDate: string;
  endDate: string;
  totalPrizePool: number;
  winners: RaceHistoryWinner[];
}

export interface AdminRace {
  id: string;
  type: RaceType;
  startDate: string;
  endDate: string;
  totalPrizePool: number;
  status: "active" | "ended";
  phase: RacePhase;
  prizes: RacePrize[];
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

export interface WagererTotals {
  today: string;
  weekly: string;
  monthly: string;
  allTime: string;
}

export const wagerLeaderboardApi = {
  getActive: (type: RaceType) =>
    api.get(`/api/wager-leaderboard/active?type=${type}`).then((d) => d.race as ActiveRace | null),
  getHistory: (type: RaceType) =>
    api.get(`/api/wager-leaderboard/history?type=${type}`).then((d) => d.races as RaceHistoryEntry[]),
  getAdminWagers: () => api.get("/api/wager-leaderboard/admin/wagers").then((d) => d.users as AdminWagerRow[]),
  getAllWagerers: () =>
    api.get("/api/wager-leaderboard/admin/all-wagerers").then((d) => d.wagerers as AllWagererRow[]),
  getWagerTotals: () =>
    api.get("/api/wager-leaderboard/admin/wager-totals").then((d) => d.totals as WagererTotals),
  listRaces: (type: RaceType) =>
    api.get(`/api/wager-leaderboard/admin/races?type=${type}`).then((d) => d.races as AdminRace[]),
  createRace: (race: { type: RaceType; startDate: string; endDate: string; totalPrizePool: number; prizes: RacePrize[] }) =>
    api.post("/api/wager-leaderboard/admin/races", race).then((d) => d.race as AdminRace),
  updateRace: (raceId: string, race: { startDate?: string; endDate?: string; totalPrizePool?: number; prizes?: RacePrize[] }) =>
    api.put(`/api/wager-leaderboard/admin/races/${raceId}`, race).then((d) => d.race as AdminRace),
  deleteRace: (raceId: string) => api.delete(`/api/wager-leaderboard/admin/races/${raceId}`),
  resync: () =>
    api
      .post("/api/wager-leaderboard/admin/resync", {})
      .then((d) => d as { success: boolean; syncedDays: number; failedDays: string[] }),
};
