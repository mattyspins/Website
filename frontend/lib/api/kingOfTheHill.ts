import { api } from "@/lib/api";

export interface KothUser {
  id: string;
  displayName: string;
  kickUsername: string | null;
  avatarUrl: string | null;
}

export interface KothRound {
  id: string;
  sessionId: string;
  entryId: string;
  userId: string;
  slotName: string | null;
  betAmount: string | null;
  payoutAmount: string | null;
  multiplier: string | null;
  isKing: boolean;
  drawnAt: string;
  slotCalledAt: string | null;
  playedAt: string | null;
  dethronedAt: string | null;
  user: KothUser;
}

export interface KothEntry {
  id: string;
  sessionId: string;
  userId: string;
  status: "WAITING" | "DRAWN" | "KING";
  joinedAt: string;
  drawnAt: string | null;
  user: KothUser;
}

export interface KothSession {
  id: string;
  label: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
  entries: KothEntry[];
  rounds: KothRound[];
}

export const kothApi = {
  getAll: () => api.get("/api/king-of-the-hill").then((d) => d.sessions as KothSession[]),
  getActive: () => api.get("/api/king-of-the-hill/active").then((d) => d.session as KothSession | null),
  create: (label?: string) =>
    api.post("/api/king-of-the-hill", { label }).then((d) => d.session as KothSession),
  close: (id: string) => api.post(`/api/king-of-the-hill/${id}/close`, {}).then((d) => d.session as KothSession),
  draw: (id: string) => api.post(`/api/king-of-the-hill/${id}/draw`, {}).then((d) => d.session as KothSession),
  cancelDraw: (id: string) =>
    api.post(`/api/king-of-the-hill/${id}/cancel-draw`, {}).then((d) => d.session as KothSession),
  addEntry: (id: string, kickUsername: string) =>
    api.post(`/api/king-of-the-hill/${id}/add-entry`, { kickUsername }).then((d) => d.session as KothSession),
  removeEntry: (entryId: string) =>
    api.delete(`/api/king-of-the-hill/entries/${entryId}`).then((d) => d.session as KothSession),
  submitRound: (entryId: string, betAmount: number, payoutAmount: number) =>
    api
      .post(`/api/king-of-the-hill/entries/${entryId}/round`, { betAmount, payoutAmount })
      .then((d) => d.session as KothSession),
  delete: (id: string) => api.delete(`/api/king-of-the-hill/${id}`),
};
