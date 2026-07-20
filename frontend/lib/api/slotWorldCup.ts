import { api } from '@/lib/api';
import {
  SlotWorldCup,
  SlotWorldCupLeaderboardEntry,
  SlotWorldCupNominationRanking,
  SlotWorldCupPrediction,
} from '@/types/slotWorldCup';

export const slotWorldCupApi = {
  getAll: async (): Promise<SlotWorldCup[]> => {
    const data = await api.get('/api/slot-world-cup');
    return data.tournaments;
  },

  getById: async (id: string): Promise<SlotWorldCup> => {
    const data = await api.get(`/api/slot-world-cup/${id}`);
    return data.tournament;
  },

  getNominations: async (id: string): Promise<SlotWorldCupNominationRanking[]> => {
    const data = await api.get(`/api/slot-world-cup/${id}/nominations`);
    return data.nominations;
  },

  getLeaderboard: async (id: string): Promise<SlotWorldCupLeaderboardEntry[]> => {
    const data = await api.get(`/api/slot-world-cup/${id}/leaderboard`);
    return data.leaderboard;
  },

  getMyPrediction: async (id: string): Promise<SlotWorldCupPrediction | null> => {
    const data = await api.get(`/api/slot-world-cup/${id}/my-prediction`);
    return data.prediction;
  },

  nominate: async (id: string, slotName: string): Promise<SlotWorldCupNominationRanking[]> => {
    const data = await api.post(`/api/slot-world-cup/${id}/nominate`, { slotName });
    return data.nominations;
  },

  submitPrediction: async (id: string, picks: Record<string, string>): Promise<SlotWorldCupPrediction> => {
    const data = await api.post(`/api/slot-world-cup/${id}/predict`, { picks });
    return data.prediction;
  },

  // Admin
  create: async (payload: { title: string; size: number; nominationCommand?: string }): Promise<SlotWorldCup> => {
    const data = await api.post('/api/slot-world-cup', payload);
    return data.tournament;
  },

  lockNominations: async (id: string): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/lock-nominations`);
    return data.tournament;
  },

  addSlot: async (id: string, slotName: string, provider?: string, imageUrl?: string): Promise<void> => {
    await api.post(`/api/slot-world-cup/${id}/slots`, { slotName, provider, imageUrl });
  },

  removeSlot: async (id: string, slotId: string): Promise<void> => {
    await api.delete(`/api/slot-world-cup/${id}/slots/${slotId}`);
  },

  finalizeParticipants: async (id: string, mode: 'auto' | 'manual', slotNames?: string[]): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/finalize-participants`, { mode, slotNames });
    return data.tournament;
  },

  generateBracket: async (id: string, seeding: 'RANDOM' | 'POPULARITY'): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/generate-bracket`, { seeding });
    return data.tournament;
  },

  openPredictions: async (id: string): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/open-predictions`);
    return data.tournament;
  },

  closePredictions: async (id: string): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/close-predictions`);
    return data.tournament;
  },

  // `key` is the ranking's normalizedName, not the display name — that's what
  // groups every viewer's nomination of the same slot together.
  approveNomination: async (id: string, key: string, provider?: string, imageUrl?: string): Promise<void> => {
    await api.post(`/api/slot-world-cup/${id}/nominations/approve`, { key, provider, imageUrl });
  },

  rejectNomination: async (id: string, key: string): Promise<void> => {
    await api.post(`/api/slot-world-cup/${id}/nominations/reject`, { key });
  },

  setMatchRule: async (id: string, matchRule: string): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/match-rule`, { matchRule });
    return data.tournament;
  },

  reset: async (id: string): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/reset`);
    return data.tournament;
  },

  submitMatchResult: async (matchId: string, betA: number, payoutA: number, betB: number, payoutB: number): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/matches/${matchId}/result`, { betA, payoutA, betB, payoutB });
    return data.tournament;
  },

  cancel: async (id: string): Promise<SlotWorldCup> => {
    const data = await api.post(`/api/slot-world-cup/${id}/cancel`);
    return data.tournament;
  },
};
