import { api } from "@/lib/api";

export type BountyHunterStatus = "REGISTRATION" | "ACTIVE" | "SETTLED";
export type BountyHunterEntryStatus = "WAITING" | "DRAWN" | "DONE";

export interface BountyHunterUser {
  id: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
}

export interface BountyHunterEntry {
  id: string;
  huntId: string;
  userId: string;
  slotName: string | null;
  status: BountyHunterEntryStatus;
  joinedAt: string;
  drawnAt: string | null;
  user: BountyHunterUser;
}

export interface BountyHunterRound {
  id: string;
  huntId: string;
  entryId: string;
  userId: string;
  epoch: number;
  slotName: string | null;
  multiplier: string | null;
  qualifies: boolean;
  skipped: boolean;
  drawnAt: string;
  slotCalledAt: string | null;
  playedAt: string | null;
  heat: string | null;
  user: BountyHunterUser;
  // Admin-only fields — present on responses from authenticated /active/admin and
  // action endpoints, absent from the public /active response.
  betAmount?: string | null;
  payoutAmount?: string | null;
  distance?: number | null;
}

export interface BountyHunter {
  id: string;
  keyword: string;
  status: BountyHunterStatus;
  registrationOpen: boolean;
  claimZone: number;
  pot: number;
  rolloverCount: number;
  epoch: number;
  createdAt: string;
  closedAt: string | null;
  entries: BountyHunterEntry[];
  rounds: BountyHunterRound[];
  // Admin-only — never present on the public /active response.
  target?: number;
  targetMin?: number;
  targetMax?: number;
  winnerEntryId?: string | null;
}

export interface BountyHunterRoundResult {
  hunt: BountyHunter;
  multiplier: number;
  distance: number;
  qualifies: boolean;
  heat: string;
}

export const bountyHunterApi = {
  getAll: () => api.get("/api/bounty-hunter").then((d) => d.hunts as BountyHunter[]),
  getActive: () => api.get("/api/bounty-hunter/active").then((d) => d.hunt as BountyHunter | null),
  getActiveAdmin: () => api.get("/api/bounty-hunter/active/admin").then((d) => d.hunt as BountyHunter | null),
  create: (keyword: string, targetMin: number, targetMax: number, claimZone: number, pot: number) =>
    api.post("/api/bounty-hunter", { keyword, targetMin, targetMax, claimZone, pot }).then((d) => d.hunt as BountyHunter),
  setRegistrationOpen: (id: string, open: boolean) =>
    api.post(`/api/bounty-hunter/${id}/registration`, { open }).then((d) => d.hunt as BountyHunter),
  addEntry: (id: string, kickUsername: string) =>
    api.post(`/api/bounty-hunter/${id}/add-entry`, { kickUsername }).then((d) => d.hunt as BountyHunter),
  removeEntry: (entryId: string) =>
    api.delete(`/api/bounty-hunter/entries/${entryId}`).then((d) => d.hunt as BountyHunter),
  draw: (id: string) => api.post(`/api/bounty-hunter/${id}/draw`, {}).then((d) => d.hunt as BountyHunter),
  setSlot: (entryId: string, slotName: string) =>
    api.post(`/api/bounty-hunter/entries/${entryId}/slot`, { slotName }).then((d) => d.hunt as BountyHunter),
  skipPlayer: (entryId: string) =>
    api.post(`/api/bounty-hunter/entries/${entryId}/skip`, {}).then((d) => d.hunt as BountyHunter),
  submitRound: (entryId: string, betAmount: number, payoutAmount: number) =>
    api
      .post(`/api/bounty-hunter/entries/${entryId}/round`, { betAmount, payoutAmount })
      .then((d) => d as BountyHunterRoundResult),
  settleBounty: (id: string) => api.post(`/api/bounty-hunter/${id}/settle`, {}).then((d) => d.hunt as BountyHunter),
  forceRollover: (id: string) => api.post(`/api/bounty-hunter/${id}/force-rollover`, {}).then((d) => d.hunt as BountyHunter),
  rerollTarget: (id: string) => api.post(`/api/bounty-hunter/${id}/reroll-target`, {}).then((d) => d.hunt as BountyHunter),
  setTarget: (id: string, target: number) =>
    api.post(`/api/bounty-hunter/${id}/target`, { target }).then((d) => d.hunt as BountyHunter),
  setClaimZone: (id: string, claimZone: number) =>
    api.post(`/api/bounty-hunter/${id}/claim-zone`, { claimZone }).then((d) => d.hunt as BountyHunter),
  setPot: (id: string, pot: number) => api.post(`/api/bounty-hunter/${id}/pot`, { pot }).then((d) => d.hunt as BountyHunter),
  delete: (id: string) => api.delete(`/api/bounty-hunter/${id}`),
};
