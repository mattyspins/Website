import { api } from '@/lib/api';
import {
  Tournament,
  MyEntryResponse,
  TournamentMatch,
  TournamentEntry,
  DrawStatus,
  UpdateTournamentInput,
} from '@/types/tournament';

export const tournamentApi = {
  getAll: async (): Promise<Tournament[]> => {
    const data = await api.get('/api/tournaments');
    return data.tournaments;
  },

  getById: async (id: string): Promise<Tournament> => {
    const data = await api.get(`/api/tournaments/${id}`);
    return data.tournament;
  },

  getMyEntry: async (id: string): Promise<MyEntryResponse> => {
    const data = await api.get(`/api/tournaments/${id}/my-entry`);
    return data;
  },

  enter: async (id: string, slot: string): Promise<void> => {
    await api.post(`/api/tournaments/${id}/enter`, { slot });
  },

  leave: async (id: string): Promise<void> => {
    await api.delete(`/api/tournaments/${id}/enter`);
  },

  // Admin
  create: async (payload: { title: string; maxPlayers: number; keyword?: string }): Promise<Tournament> => {
    const data = await api.post('/api/tournaments', payload);
    return data.tournament;
  },

  updateTournament: async (id: string, payload: UpdateTournamentInput): Promise<Tournament> => {
    const data = await api.patch(`/api/tournaments/${id}`, payload);
    return data.tournament;
  },

  openRegistration: async (id: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/open-registration`);
    return data.tournament;
  },

  lockRegistration: async (id: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/lock`);
    return data.tournament;
  },

  getDrawStatus: async (id: string): Promise<DrawStatus> => {
    const data = await api.get(`/api/tournaments/${id}/draw`);
    return data.draw;
  },

  runDraw: async (id: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/draw/run`);
    return data.tournament;
  },

  startTournament: async (id: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/start`);
    return data.tournament;
  },

  cancel: async (id: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/cancel`);
    return data.tournament;
  },

  deleteTournament: async (id: string): Promise<void> => {
    await api.delete(`/api/tournaments/${id}`);
  },

  getEntries: async (id: string): Promise<TournamentEntry[]> => {
    const data = await api.get(`/api/tournaments/${id}/entries`);
    return data.entries;
  },

  invalidateEntry: async (tournamentId: string, entryId: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${tournamentId}/entries/${entryId}/invalidate`);
    return data.tournament;
  },

  restoreEntry: async (tournamentId: string, entryId: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${tournamentId}/entries/${entryId}/restore`);
    return data.tournament;
  },

  banUser: async (tournamentId: string, userId: string, reason?: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${tournamentId}/ban`, { userId, reason });
    return data.tournament;
  },

  unbanUser: async (tournamentId: string, userId: string): Promise<Tournament> => {
    const data = await api.delete(`/api/tournaments/${tournamentId}/ban/${userId}`);
    return data.tournament;
  },

  replaceParticipant: async (tournamentId: string, participantId: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${tournamentId}/participants/${participantId}/replace`);
    return data.tournament;
  },

  setMatchResult: async (matchId: string, participantId: string, resultText: string): Promise<TournamentMatch> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/result`, { participantId, resultText });
    return data.match;
  },

  declareMatchWinner: async (matchId: string, winnerId: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/winner`, { winnerId });
    return data.tournament;
  },

  revertMatchWinner: async (matchId: string): Promise<Tournament> => {
    const data = await api.delete(`/api/tournaments/matches/${matchId}/winner`);
    return data.tournament;
  },

  pauseMatch: async (matchId: string): Promise<TournamentMatch> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/pause`);
    return data.match;
  },

  resumeMatch: async (matchId: string): Promise<TournamentMatch> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/resume`);
    return data.match;
  },
};
