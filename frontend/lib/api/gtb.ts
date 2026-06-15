import { api } from "@/lib/api";

export interface GTBGame {
  id: string;
  title?: string;
  startingBalance: number;
  numberOfBonuses: number;
  breakEvenMultiplier: number;
  finalBalance?: number;
  status: "DRAFT" | "OPEN" | "CLOSED" | "COMPLETED";
  winnerId?: string;
  winnerGuess?: number;
  winnerReward?: number;
  totalGuesses?: number;
  openedAt?: string;
  closedAt?: string;
  completedAt?: string;
  winner?: {
    id: string;
    displayName: string;
    avatar?: string;
    guessAmount: number;
    difference: number;
    reward: number;
  };
}

export const gtbApi = {
  createAndOpen: (data: {
    title?: string;
    startingBalance: number;
    numberOfBonuses: number;
    breakEvenMultiplier: number;
  }) =>
    api.post("/api/guess-the-balance/admin/create-and-open", data).then((d) => d.game as GTBGame),

  getGame: (id: string) =>
    api.get(`/api/guess-the-balance/${id}`).then((d) => d.game as GTBGame),

  closeGuessing: (id: string) =>
    api.patch(`/api/guess-the-balance/admin/${id}/close`, {}).then((d) => d.game as GTBGame),

  complete: (id: string, finalBalance: number, winnerReward: number) =>
    api.post(`/api/guess-the-balance/admin/${id}/complete`, { finalBalance, winnerReward }).then((d) => d.game as GTBGame),
};
