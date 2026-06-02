import { api } from '@/lib/api';
import { Tournament, MyEntryResponse, TournamentMatch } from '@/types/tournament';

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

  enter: async (id: string): Promise<void> => {
    await api.post(`/api/tournaments/${id}/enter`);
  },

  leave: async (id: string): Promise<void> => {
    await api.delete(`/api/tournaments/${id}/enter`);
  },

  setInitialSlot: async (id: string, slotCall: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/slot`, { slotCall });
    return data.tournament;
  },

  setMatchSlot: async (matchId: string, slotCall: string): Promise<TournamentMatch> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/slot`, { slotCall });
    return data.match;
  },

  confirmMatchSlot: async (matchId: string): Promise<TournamentMatch> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/confirm`);
    return data.match;
  },

  // Admin
  create: async (payload: { title: string; maxPlayers: number; slotTimerSeconds: number }): Promise<Tournament> => {
    const data = await api.post('/api/tournaments', payload);
    return data.tournament;
  },

  openRegistration: async (id: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/open-registration`);
    return data.tournament;
  },

  getEntries: async (id: string): Promise<{ id: string; userId: string; displayName: string; avatarUrl: string | null; enteredAt: string }[]> => {
    const data = await api.get(`/api/tournaments/${id}/entries`);
    return data.entries;
  },

  drawWinners: async (id: string, count: number, guaranteedUserIds: string[] = []): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${id}/draw`, { count, guaranteedUserIds });
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

  rerollParticipant: async (tournamentId: string, participantId: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/${tournamentId}/participants/${participantId}/reroll`);
    return data.tournament;
  },

  declareMatchWinner: async (matchId: string, winnerId: string): Promise<Tournament> => {
    const data = await api.post(`/api/tournaments/matches/${matchId}/winner`, { winnerId });
    return data.tournament;
  },

  revertMatchWinner: async (matchId: string): Promise<Tournament> => {
    const data = await api.delete(`/api/tournaments/matches/${matchId}/winner`);
    return data.tournament;
  },
};
