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

export interface MatchParticipant {
  id: string;
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  slotCall: string | null;
  slotConfirmed: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: MatchStatus;
  winnerId: string | null;
  nextMatchId: string | null;
  slotDeadline: string | null;
  participants: MatchParticipant[];
}

export interface TournamentParticipant {
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

export interface Tournament {
  id: string;
  title: string;
  status: TournamentStatus;
  maxPlayers: number;
  slotTimerSeconds: number;
  currentRound: number;
  entryCount: number;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  createdAt: string;
  updatedAt: string;
}

export interface MyEntryResponse {
  entered: boolean;
  isParticipant: boolean;
  participant: TournamentParticipant | null;
}
