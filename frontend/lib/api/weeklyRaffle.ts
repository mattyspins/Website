import { api } from "@/lib/api";

export type WeeklyRaffleStatus = "OPEN" | "DRAWN";

export interface WeeklyRaffleRequirement {
  type: "MIN_WEEKLY_WAGER";
  value: number;
}

export interface WeeklyRaffleUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface WeeklyRaffle {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: WeeklyRaffleStatus;
  requirements: WeeklyRaffleRequirement[];
  winnerUserId: string | null;
  eliminationOrder: string[] | null;
  eligibleCount: number | null;
  drawnAt: string | null;
  drawnBy: string | null;
  createdAt: string;
  createdBy: string | null;
  winner: WeeklyRaffleUser | null;
}

export interface WeeklyRaffleParticipant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  wagered: number;
}

export interface WeeklyRaffleEligibility {
  eligible: boolean;
  reasons: string[];
  wagered: number;
  requirements: WeeklyRaffleRequirement[];
}

export interface WeeklyRaffleDrawResult {
  raffle: WeeklyRaffle;
  eliminationOrder: string[];
  participants: WeeklyRaffleParticipant[];
}

export const weeklyRaffleApi = {
  getCurrent: () => api.get("/api/weekly-raffle/current").then((d) => d.raffle as WeeklyRaffle | null),
  getById: (id: string) => api.get(`/api/weekly-raffle/${id}`).then((d) => d.raffle as WeeklyRaffle),
  getHistory: (limit = 20) =>
    api.get(`/api/weekly-raffle/history?limit=${limit}`).then((d) => d.history as WeeklyRaffle[]),
  getPendingDraws: () => api.get(`/api/weekly-raffle/pending-draws`).then((d) => d.pending as WeeklyRaffle[]),
  getMyEligibility: (id: string) =>
    api.get(`/api/weekly-raffle/${id}/my-eligibility`).then((d) => d.eligibility as WeeklyRaffleEligibility),
  getEligibleCount: (id: string) => api.get(`/api/weekly-raffle/${id}/eligible-count`).then((d) => d.count as number),

  create: (requirements: WeeklyRaffleRequirement[]) =>
    api.post("/api/weekly-raffle", { requirements }).then((d) => d.raffle as WeeklyRaffle),
  getEligiblePreview: (id: string) =>
    api
      .get(`/api/weekly-raffle/${id}/eligible-preview`)
      .then((d) => ({ participants: d.participants as WeeklyRaffleParticipant[], count: d.count as number })),
  draw: (id: string) => api.post(`/api/weekly-raffle/${id}/draw`, {}).then((d) => d as WeeklyRaffleDrawResult),
  updateRequirements: (id: string, requirements: WeeklyRaffleRequirement[]) =>
    api.patch(`/api/weekly-raffle/${id}`, { requirements }).then((d) => d.raffle as WeeklyRaffle),
};
