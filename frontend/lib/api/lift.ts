import { api } from "@/lib/api";

export type LiftStatus =
  | "JOIN"
  | "READY"
  | "ROUND_LOBBY"
  | "ROUND_DECISION"
  | "ROUND_LOCK"
  | "ROUND_PAUSE"
  | "ROUND_RESOLVE"
  | "FINALE"
  | "ENDED"
  | "CANCELLED";

export type LiftRoundType = "CHOICE" | "SYNC" | null;

export interface LiftPlayer {
  kickUsername: string;
  avatarUrl: string | null;
  avatarSeed: number;
  alive: boolean;
  ready: boolean;
  currentElevator: string | null;
}

export interface LiftElevator {
  letter: string;
  current: number;
  required: number | null;
  status: string;
}

export interface LiftSession {
  id: string;
  label: string | null;
  status: LiftStatus;
  round: number;
  roundType: LiftRoundType;
  joinKeyword: string;
  readyKeyword: string;
  phaseEndsAt: string | null;
  caption: string | null;
  captionSub: string | null;
  survivors: number;
  createdAt: string;
  endedAt: string | null;
  players: LiftPlayer[];
  elevators: LiftElevator[];
}

export const liftApi = {
  getActive: () => api.get("/api/lift/active").then((d) => d.session as LiftSession | null),
  getById: (id: string) => api.get(`/api/lift/${id}`).then((d) => d.session as LiftSession),
  create: (label?: string) => api.post("/api/lift", { label }).then((d) => d.session as LiftSession),
  advanceToReady: (id: string) => api.post(`/api/lift/${id}/advance-ready`, {}).then((d) => d.session as LiftSession),
  start: (id: string) => api.post(`/api/lift/${id}/start`, {}).then((d) => d.session as LiftSession),
  cancel: (id: string) => api.post(`/api/lift/${id}/cancel`, {}).then((d) => d.session as LiftSession),
};
