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
  id: string;
  position: number;
  /** null when the winner wagers under our Razed code but hasn't linked a site account. */
  userId: string | null;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
  linked: boolean;
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

// Race schedules and prizes are hardcoded server-side in the backend's
// config/wagerRaces.ts, so there is no create/update/delete client here.
export const wagerLeaderboardApi = {
  getActive: (type: RaceType) =>
    api.get(`/api/wager-leaderboard/active?type=${type}`).then((d) => d.race as ActiveRace | null),
  getHistory: (type: RaceType) =>
    api.get(`/api/wager-leaderboard/history?type=${type}`).then((d) => d.races as RaceHistoryEntry[]),
  resync: () =>
    api
      .post("/api/wager-leaderboard/admin/resync", {})
      .then((d) => d as { success: boolean; alreadyRunning: boolean }),
  resyncStatus: () =>
    api
      .get("/api/wager-leaderboard/admin/resync/status")
      .then((d) => d as { running: boolean; result: { syncedDays: number; failedDays: string[] } | null; error: string | null }),
};
