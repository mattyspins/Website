export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  SLOT_SELECTION = 'SLOT_SELECTION',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MatchStatus {
  PENDING = 'PENDING',
  SLOT_SELECTION = 'SLOT_SELECTION',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface CreateTournamentDTO {
  title: string;
  maxPlayers: number;
  slotTimerSeconds: number;
}

export interface DrawWinnersDTO {
  count: number;
}

export interface SetSlotDTO {
  slotCall: string;
}

export interface DeclareWinnerDTO {
  winnerId: string; // TournamentParticipant id
}

export interface ParticipantResponse {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  seed: number | null;
  currentSlot: string | null;
  slotConfirmed: boolean;
  slotDeadline: string | null;
  eliminated: boolean;
  finalPosition: number | null;
}

export interface MatchParticipantResponse {
  id: string;
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  slotCall: string | null;
  slotConfirmed: boolean;
}

export interface MatchResponse {
  id: string;
  round: number;
  matchNumber: number;
  status: MatchStatus;
  winnerId: string | null;
  nextMatchId: string | null;
  slotDeadline: string | null;
  participants: MatchParticipantResponse[];
}

export interface TournamentResponse {
  id: string;
  title: string;
  status: TournamentStatus;
  maxPlayers: number;
  slotTimerSeconds: number;
  currentRound: number;
  entryCount: number;
  participants: ParticipantResponse[];
  matches: MatchResponse[];
  createdAt: string;
  updatedAt: string;
}
