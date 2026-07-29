export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  LOCKED = 'LOCKED',
  DRAWN = 'DRAWN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// SLOT_SELECTION deliberately omitted — it still exists in the DB enum (see
// schema.prisma comment) but nothing in the app emits or accepts it anymore.
export enum MatchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export enum TournamentEntrySource {
  WEB = 'WEB',
  CHAT = 'CHAT',
}

export interface CreateTournamentDTO {
  title: string;
  maxPlayers: number;
  keyword?: string;
}

export interface UpdateTournamentDTO {
  title?: string;
  keyword?: string;
  maxPlayers?: number;
  allowDuplicateSlots?: boolean;
  betAmountPerSpin?: number | null;
  prizePoolDisplay?: string | null;
}

export interface EnterRaffleDTO {
  slot: string;
}

export interface BanUserDTO {
  userId?: string;
  kickUsername?: string;
  reason?: string;
}

export interface SetMatchResultDTO {
  participantId: string;
  resultText: string;
}

export interface DeclareWinnerDTO {
  winnerId: string; // TournamentParticipant id
}

export interface ParticipantResponse {
  id: string;
  userId: string | null;
  kickUsername: string | null;
  displayName: string;
  avatarUrl: string | null;
  seed: number | null;
  currentSlot: string | null;
  eliminated: boolean;
  finalPosition: number | null;
}

export interface MatchParticipantResponse {
  id: string;
  participantId: string;
  userId: string | null;
  kickUsername: string | null;
  displayName: string;
  avatarUrl: string | null;
  slotCall: string | null;
  resultText: string | null;
}

export interface MatchResponse {
  id: string;
  round: number;
  matchNumber: number;
  status: MatchStatus;
  winnerId: string | null;
  nextMatchId: string | null;
  participants: MatchParticipantResponse[];
}

export interface TournamentEntryResponse {
  id: string;
  userId: string | null;
  kickUsername: string | null;
  displayName: string;
  avatarUrl: string | null;
  slot: string | null;
  source: TournamentEntrySource;
  invalidated: boolean;
  banned: boolean;
  enteredAt: string;
}

export interface ReserveResponse {
  rank: number;
  entryId: string;
  userId: string | null;
  kickUsername: string | null;
  displayName: string;
  avatarUrl: string | null;
  slot: string | null;
}

export interface TournamentResponse {
  id: string;
  title: string;
  status: TournamentStatus;
  keyword: string;
  maxPlayers: number;
  currentRound: number;
  allowDuplicateSlots: boolean;
  betAmountPerSpin: string | null;
  prizePoolDisplay: string | null;
  // Published the moment registration locks, before the draw runs — proves
  // the outcome wasn't picked after seeing who registered. drawSeed itself
  // (needed to actually re-derive the draw order) is only ever included
  // once drawExecutedAt is set (the reveal step of the commit-reveal scheme).
  seedCommitmentHash: string | null;
  drawSeed: string | null;
  drawExecutedAt: string | null;
  entryCount: number;
  reserveCount: number;
  // Full reserve details are public (not admin-gated) — same reasoning as
  // the seed reveal below: the "verify the draw yourself" claim only means
  // something if everyone can actually see the outcome, not just admins.
  reserves: ReserveResponse[];
  participants: ParticipantResponse[];
  matches: MatchResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DrawStatusResponse {
  phase: 'not_locked' | 'ready' | 'complete';
  seedCommitmentHash: string | null;
  drawSeed: string | null;
  targetCount: number;
  eligiblePool: { entryId: string; userId: string | null; kickUsername: string | null; displayName: string; avatarUrl: string | null; slot: string | null }[];
  selected: { entryId: string; seed: number; userId: string | null; kickUsername: string | null; displayName: string; avatarUrl: string | null; slot: string | null }[];
  reserves: ReserveResponse[];
}
