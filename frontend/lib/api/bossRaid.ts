import { api } from "@/lib/api";

export type BossKey = "inferno" | "frost" | "storm" | "shadow" | "mecha" | "void";

export interface BossConfig {
  key: BossKey;
  name: string;
  icon: string;
  passiveName: string;
  description: string;
  hue: number;
  chroma: number;
}

export interface BossRaidUser {
  id: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
}

export interface BossRaidEntry {
  id: string;
  raidId: string;
  userId: string;
  slotName: string | null;
  status: "WAITING" | "DRAWN" | "DONE";
  joinedAt: string;
  drawnAt: string | null;
  user: BossRaidUser;
}

export interface BossRaidRound {
  id: string;
  raidId: string;
  entryId: string;
  userId: string;
  slotName: string | null;
  betAmount: string | null;
  payoutAmount: string | null;
  multiplier: string | null;
  damageDealt: number;
  healApplied: number;
  isDeadBonus: boolean;
  isRetrigger: boolean;
  isCrit: boolean;
  isLegendary: boolean;
  skipped: boolean;
  drawnAt: string;
  slotCalledAt: string | null;
  playedAt: string | null;
  user: BossRaidUser;
}

export interface BossRaid {
  id: string;
  bossKey: BossKey;
  boss: BossConfig;
  keyword: string;
  status: "REGISTRATION" | "ACTIVE" | "COMPLETED";
  maxHp: number;
  currentHp: number;
  phase: number;
  rage: number;
  roundCount: number;
  consecutiveBucket: string | null;
  consecutiveCount: number;
  soulShields: number;
  voidModifier: string | null;
  defeated: boolean;
  createdAt: string;
  closedAt: string | null;
  entries: BossRaidEntry[];
  rounds: BossRaidRound[];
}

export interface BossRaidRoundResult {
  raid: BossRaid;
  damageDealt: number;
  multiplier: number;
  isStunThreshold: boolean;
  isLegendary: boolean;
  isRetriggerApplied: boolean;
  frozenThisRound: boolean;
  infernoArmorShed: boolean;
  phaseChanged: boolean;
  bannerText: string | null;
  defeated: boolean;
}

export interface BossRaidDeadBonusResult {
  raid: BossRaid;
  healApplied: number;
  bannerText: string | null;
}

export const bossRaidApi = {
  getRoster: () => api.get("/api/boss-raid/roster").then((d) => d.roster as BossConfig[]),
  getAll: () => api.get("/api/boss-raid").then((d) => d.raids as BossRaid[]),
  getActive: () => api.get("/api/boss-raid/active").then((d) => d.raid as BossRaid | null),
  create: (bossKey: BossKey, keyword: string, maxHp?: number) =>
    api.post("/api/boss-raid", { bossKey, keyword, maxHp }).then((d) => d.raid as BossRaid),
  closeRegistration: (id: string) =>
    api.post(`/api/boss-raid/${id}/close-registration`, {}).then((d) => d.raid as BossRaid),
  addEntry: (id: string, kickUsername: string) =>
    api.post(`/api/boss-raid/${id}/add-entry`, { kickUsername }).then((d) => d.raid as BossRaid),
  removeEntry: (entryId: string) =>
    api.delete(`/api/boss-raid/entries/${entryId}`).then((d) => d.raid as BossRaid),
  draw: (id: string) => api.post(`/api/boss-raid/${id}/draw`, {}).then((d) => d.raid as BossRaid),
  setSlot: (entryId: string, slotName: string) =>
    api.post(`/api/boss-raid/entries/${entryId}/slot`, { slotName }).then((d) => d.raid as BossRaid),
  skipPlayer: (entryId: string) =>
    api.post(`/api/boss-raid/entries/${entryId}/skip`, {}).then((d) => d.raid as BossRaid),
  submitDeadBonus: (entryId: string) =>
    api.post(`/api/boss-raid/entries/${entryId}/dead-bonus`, {}).then((d) => d as BossRaidDeadBonusResult),
  submitRound: (entryId: string, betAmount: number, payoutAmount: number, isRetrigger: boolean) =>
    api
      .post(`/api/boss-raid/entries/${entryId}/round`, { betAmount, payoutAmount, isRetrigger })
      .then((d) => d as BossRaidRoundResult),
  endRaid: (id: string) => api.post(`/api/boss-raid/${id}/end`, {}).then((d) => d.raid as BossRaid),
  delete: (id: string) => api.delete(`/api/boss-raid/${id}`),
};
