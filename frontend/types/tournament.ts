export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  LOCKED = 'LOCKED',
  DRAWN = 'DRAWN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MatchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export enum TournamentScoringMethod {
  TOTAL_MULTIPLIER = 'TOTAL_MULTIPLIER',
  HIGHEST_SINGLE_WIN = 'HIGHEST_SINGLE_WIN',
  FINAL_BALANCE = 'FINAL_BALANCE',
}

export enum TournamentEntrySource {
  WEB = 'WEB',
  CHAT = 'CHAT',
}

export interface MatchParticipant {
  id: string;
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  slotCall: string | null;
  resultText: string | null;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: MatchStatus;
  winnerId: string | null;
  nextMatchId: string | null;
  participants: MatchParticipant[];
}

export interface TournamentParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  seed: number | null;
  currentSlot: string | null;
  eliminated: boolean;
  finalPosition: number | null;
}

export interface Tournament {
  id: string;
  title: string;
  status: TournamentStatus;
  keyword: string;
  maxPlayers: number;
  currentRound: number;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  allowDuplicateSlots: boolean;
  eligibleSlots: string[];
  scoringMethod: TournamentScoringMethod;
  spinsPerMatch: number | null;
  betAmountPerSpin: string | null;
  prizePoolDisplay: string | null;
  seedCommitmentHash: string | null;
  drawSeed: string | null;
  drawExecutedAt: string | null;
  entryCount: number;
  reserveCount: number;
  reserves: DrawReservePlayer[];
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  createdAt: string;
  updatedAt: string;
}

export interface MyEntryResponse {
  entered: boolean;
  slot: string | null;
  isParticipant: boolean;
  participant: TournamentParticipant | null;
  banned: boolean;
}

export interface TournamentEntry {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  slot: string | null;
  source: TournamentEntrySource;
  invalidated: boolean;
  banned: boolean;
  enteredAt: string;
}

export interface DrawPoolPlayer {
  entryId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  slot: string | null;
}

export interface DrawSelectedPlayer extends DrawPoolPlayer {
  seed: number;
}

export interface DrawReservePlayer extends DrawPoolPlayer {
  rank: number;
}

export interface DrawStatus {
  phase: 'not_locked' | 'ready' | 'complete';
  seedCommitmentHash: string | null;
  drawSeed: string | null;
  targetCount: number;
  eligiblePool: DrawPoolPlayer[];
  selected: DrawSelectedPlayer[];
  reserves: DrawReservePlayer[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
}

export interface UpdateTournamentInput {
  title?: string;
  keyword?: string;
  maxPlayers?: number;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  allowDuplicateSlots?: boolean;
  eligibleSlots?: string[];
  scoringMethod?: TournamentScoringMethod;
  spinsPerMatch?: number | null;
  betAmountPerSpin?: number | null;
  prizePoolDisplay?: string | null;
}
