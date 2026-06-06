import { api, API_URL } from "@/lib/api";

export interface BingoCell {
  id: string;
  gameId: string;
  row: number;
  col: number;
  status: "EMPTY" | "ACTIVE" | "GREEN" | "RED";
  slotName: string | null;
  claimedById: string | null;
  claimedAt: string | null;
  playedAt: string | null;
  claimedBy: { id: string; displayName: string; kickUsername: string | null; avatarUrl: string | null } | null;
}

export interface BingoParticipant {
  id: string;
  gameId: string;
  userId: string;
  joinedAt: string;
  user: { id: string; displayName: string; kickUsername: string | null; avatarUrl: string | null };
}

export interface BingoLineWin {
  id: string;
  gameId: string;
  lineType: string;
  lineIndex: number;
  pointsEach: number;
  completedAt: string;
}

export interface BingoGame {
  id: string;
  title: string;
  gridSize: number;
  status: "DRAFT" | "REGISTRATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  linePoints: number;
  currentCellId: string | null;
  currentUserId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cells: BingoCell[];
  participants: BingoParticipant[];
  lineWins: BingoLineWin[];
  createdBy: { id: string; displayName: string; kickUsername: string | null; avatarUrl: string | null };
  currentUser: { id: string; displayName: string; kickUsername: string | null; avatarUrl: string | null } | null;
}

const BASE = `${API_URL}/api/bonus-bingo`;

export const bingoApi = {
  getAll: () => api.get(`/api/bonus-bingo`).then(d => d.games as BingoGame[]),
  getById: (id: string) => api.get(`/api/bonus-bingo/${id}`).then(d => d.game as BingoGame),

  // Viewer
  join: (id: string) => api.post(`/api/bonus-bingo/${id}/join`).then(d => d.game as BingoGame),
  leave: (id: string) => api.delete(`/api/bonus-bingo/${id}/join`).then(d => d.game as BingoGame),
  setSlot: (id: string, cellId: string, slotName: string) =>
    api.post(`/api/bonus-bingo/${id}/cells/${cellId}/slot`, { slotName }).then(d => d.game as BingoGame),

  // Admin
  create: (data: { title: string; gridSize: number; linePoints: number }) =>
    api.post(`/api/bonus-bingo`, data).then(d => d.game as BingoGame),
  openRegistration: (id: string) =>
    api.post(`/api/bonus-bingo/${id}/open-registration`).then(d => d.game as BingoGame),
  startGame: (id: string) => api.post(`/api/bonus-bingo/${id}/start`).then(d => d.game as BingoGame),
  spinCell: (id: string) => api.post(`/api/bonus-bingo/${id}/spin-cell`).then(d => d.game as BingoGame),
  drawPlayer: (id: string) => api.post(`/api/bonus-bingo/${id}/draw-player`).then(d => d.game as BingoGame),
  markResult: (id: string, won: boolean) =>
    api.post(`/api/bonus-bingo/${id}/result`, { won }).then(d => ({ game: d.game as BingoGame, newLineWins: d.newLineWins })),
  cancel: (id: string) => api.post(`/api/bonus-bingo/${id}/cancel`).then(d => d.game as BingoGame),
  deleteGame: (id: string) => api.delete(`/api/bonus-bingo/${id}`),
  removeParticipant: (id: string, userId: string) =>
    api.delete(`/api/bonus-bingo/${id}/participants/${userId}`).then(d => d.game as BingoGame),
};
