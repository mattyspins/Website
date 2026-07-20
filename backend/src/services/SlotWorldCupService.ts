import { prisma } from '@/config/database';
import { Server as SocketIOServer } from 'socket.io';
import { createError } from '@/middleware/errorHandler';
import {
  Prisma,
  SlotWorldCupStatus,
  SlotWorldCupSeeding,
  SlotWorldCupNominationStatus,
} from '@prisma/client';
import { logger } from '@/utils/logger';
import { PointsService } from '@/services/PointsService';

// ─── Config types ────────────────────────────────────────────────────────────

export interface ScoringConfig {
  // Points awarded for a correct pick, indexed by "distance from the final"
  // (0 = final, 1 = semi, 2 = quarter, 3 = round 1). Matches the spec's
  // Round1/QF/SF/Final weighting regardless of how many rounds the bracket has.
  stagePoints: number[]; // e.g. [8, 4, 2, 1] => final, semi, qf, round1
  upsetThresholdPercent: number;
  upsetBonusPoints: number;
  perfectBracketBonus: number;
}

export interface RewardConfig {
  // rank (1-based) -> coins
  ranks: Record<string, number>;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  stagePoints: [8, 4, 2, 1],
  upsetThresholdPercent: 10,
  upsetBonusPoints: 2,
  perfectBracketBonus: 25,
};

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  ranks: { '1': 10000, '2': 5000, '3': 2500 },
};

const OPEN_NOMINATION_STATUSES: SlotWorldCupStatus[] = [SlotWorldCupStatus.NOMINATION];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSlotName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Small Levenshtein distance used only to merge near-duplicate nominations
// (typos), since there is no canonical slot list on the backend to match against.
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

// Standard single-elimination bracket seed order (1v16, 2v15, ... style),
// generalized to any power-of-two bracket size. See NCAA-style seeding.
function bracketSeedOrder(rounds: number): number[] {
  let order = [1, 2];
  for (let r = 2; r <= rounds; r++) {
    const n = Math.pow(2, r);
    const next: number[] = [];
    for (const s of order) {
      next.push(s, n + 1 - s);
    }
    order = next;
  }
  return order;
}

function roundsForSize(size: number): number {
  return Math.ceil(Math.log2(size));
}

function matchKey(round: number, matchNumber: number): string {
  return `${round}:${matchNumber}`;
}

function pointsForRound(round: number, totalRounds: number, config: ScoringConfig): number {
  // stagePoints is anchored at the final: index 0 = final, 1 = semi, 2 = qf, …
  // (see the interface doc), so a match's weight is stagePoints[distanceFromFinal].
  // The previous `length - 1 - distanceFromFinal` inverted this — it paid 1 point
  // for calling the final and 8 for a first-round pick, the opposite of the design.
  const distanceFromFinal = totalRounds - round;
  const idx = Math.max(0, Math.min(config.stagePoints.length - 1, distanceFromFinal));
  return config.stagePoints[idx] ?? 1;
}

const TOURNAMENT_INCLUDE = {
  slots: { orderBy: { seed: 'asc' as const } },
  matches: { orderBy: [{ round: 'asc' as const }, { matchNumber: 'asc' as const }] },
  nominations: true,
} satisfies Prisma.SlotWorldCupInclude;

type TournamentWithRelations = Prisma.SlotWorldCupGetPayload<{ include: typeof TOURNAMENT_INCLUDE }>;

export class SlotWorldCupService {
  // ─── Public reads ─────────────────────────────────────────────────────────

  static async getAll() {
    return prisma.slotWorldCup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { slots: { orderBy: { seed: 'asc' } } },
    });
  }

  static async getById(id: string) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id }, include: TOURNAMENT_INCLUDE });
    if (!tournament) throw createError.notFound('Tournament not found');
    return tournament;
  }

  /**
   * Vote-ranked suggestions, grouped by the normalized slot name.
   *
   * `status` defaults to PENDING so the admin queue only shows what still needs
   * a decision; pass a status to inspect what was approved/rejected. `by` is the
   * viewer who nominated it first, which is what the admin UI credits.
   */
  static async getNominationRankings(
    tournamentId: string,
    status: SlotWorldCupNominationStatus | 'ALL' = SlotWorldCupNominationStatus.PENDING
  ) {
    const nominations = await prisma.slotWorldCupNomination.findMany({
      where: { tournamentId, ...(status === 'ALL' ? {} : { status }) },
    });
    const groups = new Map<string, { key: string; slotName: string; by: string; votes: number; firstAt: Date }>();
    for (const n of nominations) {
      const existing = groups.get(n.normalizedName);
      if (existing) {
        existing.votes += 1;
        if (n.createdAt < existing.firstAt) {
          existing.firstAt = n.createdAt;
          existing.by = n.kickUsername;
          existing.slotName = n.slotName;
        }
      } else {
        groups.set(n.normalizedName, {
          key: n.normalizedName,
          slotName: n.slotName,
          by: n.kickUsername,
          votes: 1,
          firstAt: n.createdAt,
        });
      }
    }
    return Array.from(groups.values())
      .sort((a, b) => b.votes - a.votes || a.firstAt.getTime() - b.firstAt.getTime())
      .map((g, i) => ({ rank: i + 1, key: g.key, slotName: g.slotName, by: g.by, votes: g.votes }));
  }

  /**
   * Approve a suggestion into the bracket: creates the participant slot and marks
   * every nomination for that name APPROVED so it leaves the pending queue.
   */
  static async approveNomination(
    tournamentId: string,
    normalizedName: string,
    provider?: string,
    imageUrl?: string
  ) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    const nominations = await prisma.slotWorldCupNomination.findMany({
      where: { tournamentId, normalizedName },
    });
    if (nominations.length === 0) throw createError.notFound('Suggestion not found');

    const count = await prisma.slotWorldCupSlot.count({ where: { tournamentId } });
    if (count >= tournament.size) {
      throw createError.badRequest(`This tournament already has all ${tournament.size} participants`);
    }
    // Guard the unique [tournamentId, seed] and stop the same slot being approved twice.
    const slotName = nominations[0].slotName;
    const already = await prisma.slotWorldCupSlot.findFirst({ where: { tournamentId, slotName } });
    if (already) throw createError.badRequest('That slot is already a participant');

    const [slot] = await prisma.$transaction([
      prisma.slotWorldCupSlot.create({
        data: {
          tournamentId,
          slotName,
          provider,
          imageUrl,
          seed: count + 1,
          votes: nominations.length,
        },
      }),
      prisma.slotWorldCupNomination.updateMany({
        where: { tournamentId, normalizedName },
        data: { status: SlotWorldCupNominationStatus.APPROVED },
      }),
    ]);
    return slot;
  }

  /** Reject a suggestion so it drops out of the pending queue for good. */
  static async rejectNomination(tournamentId: string, normalizedName: string) {
    await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    const { count } = await prisma.slotWorldCupNomination.updateMany({
      where: { tournamentId, normalizedName },
      data: { status: SlotWorldCupNominationStatus.REJECTED },
    });
    if (count === 0) throw createError.notFound('Suggestion not found');
  }

  /** How matchups are played on stream — descriptive; the multiplier still decides. */
  static async setMatchRule(tournamentId: string, matchRule: string) {
    const rule = matchRule.trim().slice(0, 40);
    if (!rule) throw createError.badRequest('Match rule is required');
    return prisma.slotWorldCup.update({ where: { id: tournamentId }, data: { matchRule: rule } });
  }

  /** Reopen the bracket for edits — the inverse of openPredictions. */
  static async closePredictions(tournamentId: string) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.PREDICTIONS_OPEN]);
    return prisma.slotWorldCup.update({
      where: { id: tournament.id },
      data: { status: SlotWorldCupStatus.BRACKET_SET },
    });
  }

  /**
   * Tear the tournament back down to nomination stage: drops the bracket, the
   * participants and every prediction, and returns approved/rejected suggestions
   * to the pending queue so the admin can re-pick.
   *
   * Refused once a match has a real result — at that point predictions have been
   * scored and coins may already be awarded, so a silent wipe would destroy a
   * played-out tournament. Cancel it and start a new one instead.
   */
  static async resetTournament(tournamentId: string) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    if (tournament.status === SlotWorldCupStatus.COMPLETED) {
      throw createError.badRequest('A completed tournament cannot be reset');
    }
    const played = await prisma.slotWorldCupMatch.count({
      where: { tournamentId, completedAt: { not: null }, slotAId: { not: null }, slotBId: { not: null } },
    });
    if (played > 0) {
      throw createError.badRequest(
        'Matches have already been played — cancel this tournament and create a new one instead of resetting'
      );
    }

    await prisma.$transaction([
      prisma.slotWorldCupPrediction.deleteMany({ where: { tournamentId } }),
      prisma.slotWorldCupMatch.deleteMany({ where: { tournamentId } }),
      prisma.slotWorldCupSlot.deleteMany({ where: { tournamentId } }),
      prisma.slotWorldCupNomination.updateMany({
        where: { tournamentId },
        data: { status: SlotWorldCupNominationStatus.PENDING },
      }),
      prisma.slotWorldCup.update({
        where: { id: tournamentId },
        data: {
          status: SlotWorldCupStatus.NOMINATION,
          nominationsOpen: true,
          currentRound: 0,
          championSlotId: null,
          runnerUpSlotId: null,
          closedAt: null,
        },
      }),
    ]);
    return this.getById(tournamentId);
  }

  static async getLeaderboard(tournamentId: string) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    const predictions = await prisma.slotWorldCupPrediction.findMany({ where: { tournamentId } });
    const ranked = predictions.slice().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.correctPicks !== a.correctPicks) return b.correctPicks - a.correctPicks;
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });
    return ranked.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      displayName: p.displayName,
      score: p.score,
      correctPicks: p.correctPicks,
      accuracy: p.accuracy,
    }));
  }

  static async getMyPrediction(tournamentId: string, userId: string) {
    return prisma.slotWorldCupPrediction.findUnique({ where: { tournamentId_userId: { tournamentId, userId } } });
  }

  // ─── Nominations (chat + web) ────────────────────────────────────────────

  static async nominate(tournamentId: string, kickUsername: string, rawSlotName: string) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    if (!OPEN_NOMINATION_STATUSES.includes(tournament.status) || !tournament.nominationsOpen) {
      throw createError.badRequest('Nominations are closed for this tournament');
    }
    const slotName = rawSlotName.trim().slice(0, 80);
    if (!slotName) throw createError.badRequest('Slot name is required');
    let normalized = normalizeSlotName(slotName);
    if (!normalized) throw createError.badRequest('Invalid slot name');

    // Fuzzy-merge into an existing nomination bucket if it's a near-duplicate
    // (typo tolerance) — there's no canonical slot DB on the backend to match
    // against, so this only dedupes against names already nominated this tournament.
    const existingDistinct = await prisma.slotWorldCupNomination.findMany({
      where: { tournamentId },
      distinct: ['normalizedName'],
      select: { normalizedName: true, slotName: true },
    });
    const maxDistance = normalized.length <= 6 ? 1 : 2;
    const closeMatch = existingDistinct.find(
      (e) => e.normalizedName !== normalized && levenshtein(e.normalizedName, normalized) <= maxDistance
    );
    if (closeMatch) normalized = closeMatch.normalizedName;

    const normalizedUsername = kickUsername.trim().toLowerCase();
    await prisma.slotWorldCupNomination.upsert({
      where: { tournamentId_kickUsername: { tournamentId, kickUsername: normalizedUsername } },
      create: { tournamentId, kickUsername: normalizedUsername, slotName, normalizedName: normalized },
      update: { slotName, normalizedName: normalized, updatedAt: new Date() },
    });

    return this.getNominationRankings(tournamentId);
  }

  // ─── Admin: lifecycle ─────────────────────────────────────────────────────

  static async create(
    title: string,
    size: number,
    createdById: string,
    nominationCommand: string = '!wc',
    scoringConfig: Partial<ScoringConfig> = {},
    rewardConfig: Partial<RewardConfig> = {}
  ) {
    if (![8, 12, 16].includes(size)) throw createError.badRequest('Tournament size must be 8, 12, or 16');
    const command = nominationCommand.trim() || '!wc';
    if (!command.startsWith('!')) throw createError.badRequest('Nomination command must start with "!"');
    return prisma.slotWorldCup.create({
      data: {
        title: title.trim(),
        size,
        createdById,
        nominationCommand: command,
        totalRounds: roundsForSize(size),
        scoringConfig: { ...DEFAULT_SCORING_CONFIG, ...scoringConfig } as unknown as Prisma.InputJsonValue,
        rewardConfig: { ...DEFAULT_REWARD_CONFIG, ...rewardConfig } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  static async lockNominations(tournamentId: string) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    return prisma.slotWorldCup.update({ where: { id: tournament.id }, data: { nominationsOpen: false } });
  }

  static async addSlotManually(tournamentId: string, slotName: string, provider?: string, imageUrl?: string) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    const count = await prisma.slotWorldCupSlot.count({ where: { tournamentId: tournament.id } });
    if (count >= tournament.size) throw createError.badRequest('Tournament already has the full number of slots');
    return prisma.slotWorldCupSlot.create({
      data: { tournamentId: tournament.id, slotName: slotName.trim(), provider, imageUrl, seed: count + 1, votes: 0 },
    });
  }

  static async removeSlot(tournamentId: string, slotId: string) {
    await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    await prisma.slotWorldCupSlot.delete({ where: { id: slotId } });
  }

  // Pulls the top-N nominated slots (by vote count) into SlotWorldCupSlot rows.
  // Admins can instead pass an explicit slotNames list to bypass voting entirely.
  static async finalizeParticipants(tournamentId: string, options: { mode: 'auto' | 'manual'; slotNames?: string[] }) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    const existing = await prisma.slotWorldCupSlot.count({ where: { tournamentId } });
    if (existing > 0) throw createError.badRequest('Participants have already been finalized for this tournament');

    let names: { slotName: string; votes: number }[];
    if (options.mode === 'manual') {
      if (!options.slotNames || options.slotNames.length !== tournament.size) {
        throw createError.badRequest(`Provide exactly ${tournament.size} slot names`);
      }
      names = options.slotNames.map((n) => ({ slotName: n.trim(), votes: 0 }));
    } else {
      const rankings = await this.getNominationRankings(tournamentId);
      if (rankings.length < tournament.size) {
        throw createError.badRequest(
          `Only ${rankings.length} distinct nominations so far — need ${tournament.size} to auto-finalize`
        );
      }
      names = rankings.slice(0, tournament.size).map((r) => ({ slotName: r.slotName, votes: r.votes }));
    }

    await prisma.$transaction(
      names.map((n, i) =>
        prisma.slotWorldCupSlot.create({
          data: { tournamentId, slotName: n.slotName, votes: n.votes, seed: i + 1 },
        })
      )
    );
    return prisma.slotWorldCup.update({ where: { id: tournamentId }, data: { nominationsOpen: false } });
  }

  static async generateBracket(tournamentId: string, seeding: SlotWorldCupSeeding, io?: SocketIOServer) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.NOMINATION]);
    const slots = await prisma.slotWorldCupSlot.findMany({ where: { tournamentId }, orderBy: { seed: 'asc' } });
    if (slots.length !== tournament.size) {
      throw createError.badRequest('Finalize participants before generating the bracket');
    }

    // Reseed according to the chosen method: RANDOM shuffles, POPULARITY ranks by votes desc.
    const ordered =
      seeding === SlotWorldCupSeeding.POPULARITY
        ? slots.slice().sort((a, b) => b.votes - a.votes)
        : shuffle(slots.slice());

    await prisma.$transaction(
      ordered.map((slot, i) => prisma.slotWorldCupSlot.update({ where: { id: slot.id }, data: { seed: i + 1 } }))
    );
    const seedToSlotId = new Map(ordered.map((slot, i) => [i + 1, slot.id]));

    const totalRounds = roundsForSize(tournament.size);
    const order = bracketSeedOrder(totalRounds);
    const bracketSlots = order.length;

    // Create every match row for every round up front, then link next-match pointers.
    const createdByRound: { id: string; round: number; matchNumber: number }[][] = [];
    for (let round = 1; round <= totalRounds; round++) {
      const matchCount = bracketSlots / Math.pow(2, round);
      const rows: { id: string; round: number; matchNumber: number }[] = [];
      for (let m = 0; m < matchCount; m++) {
        const created = await prisma.slotWorldCupMatch.create({
          data: { tournamentId, round, matchNumber: m },
        });
        rows.push({ id: created.id, round, matchNumber: m });
      }
      createdByRound.push(rows);
    }

    for (let round = 1; round < totalRounds; round++) {
      for (const row of createdByRound[round - 1]) {
        const nextMatch = createdByRound[round][Math.floor(row.matchNumber / 2)];
        await prisma.slotWorldCupMatch.update({
          where: { id: row.id },
          data: { nextMatchId: nextMatch.id, nextMatchSlot: row.matchNumber % 2 === 0 ? 'A' : 'B' },
        });
      }
    }

    await prisma.slotWorldCup.update({
      where: { id: tournamentId },
      data: { status: SlotWorldCupStatus.BRACKET_SET, seeding, totalRounds, currentRound: 1 },
    });

    // Populate round 1 with real slots (or byes) and auto-resolve any byes immediately.
    const round1 = createdByRound[0];
    for (const row of round1) {
      const seedA = order[row.matchNumber * 2];
      const seedB = order[row.matchNumber * 2 + 1];
      const slotAId = seedToSlotId.get(seedA) ?? null;
      const slotBId = seedToSlotId.get(seedB) ?? null;
      await prisma.slotWorldCupMatch.update({ where: { id: row.id }, data: { slotAId, slotBId } });

      if (slotAId && !slotBId) await this.resolveMatchWinner(row.id, slotAId, undefined, io, true);
      else if (slotBId && !slotAId) await this.resolveMatchWinner(row.id, slotBId, undefined, io, true);
    }

    return this.getById(tournamentId);
  }

  static async openPredictions(tournamentId: string) {
    const tournament = await this.requireStatus(tournamentId, [SlotWorldCupStatus.BRACKET_SET]);
    return prisma.slotWorldCup.update({
      where: { id: tournament.id },
      data: { status: SlotWorldCupStatus.PREDICTIONS_OPEN },
    });
  }

  static async cancel(tournamentId: string) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    if (tournament.status === SlotWorldCupStatus.COMPLETED) throw createError.badRequest('Tournament already completed');
    return prisma.slotWorldCup.update({
      where: { id: tournamentId },
      data: { status: SlotWorldCupStatus.CANCELLED, closedAt: new Date() },
    });
  }

  /**
   * Permanently remove a finished tournament from the history list.
   *
   * Restricted to CANCELLED/COMPLETED — an active tournament (nominating,
   * bracketed, or mid-prediction) has real viewer participation riding on it,
   * so deleting it needs to go through Cancel first rather than disappear in
   * one click. Cascades to its nominations/slots/matches/predictions.
   */
  static async deleteTournament(tournamentId: string) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    if (
      tournament.status !== SlotWorldCupStatus.CANCELLED &&
      tournament.status !== SlotWorldCupStatus.COMPLETED
    ) {
      throw createError.badRequest('Cancel or finish this tournament before deleting it');
    }
    await prisma.slotWorldCup.delete({ where: { id: tournamentId } });
  }

  static async updateConfig(tournamentId: string, scoringConfig?: Partial<ScoringConfig>, rewardConfig?: Partial<RewardConfig>) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    const data: Prisma.SlotWorldCupUpdateInput = {};
    if (scoringConfig) data.scoringConfig = { ...(tournament.scoringConfig as object), ...scoringConfig } as unknown as Prisma.InputJsonValue;
    if (rewardConfig) data.rewardConfig = { ...(tournament.rewardConfig as object), ...rewardConfig } as unknown as Prisma.InputJsonValue;
    return prisma.slotWorldCup.update({ where: { id: tournamentId }, data });
  }

  // ─── Predictions ──────────────────────────────────────────────────────────

  static async submitPrediction(
    tournamentId: string,
    userId: string,
    displayName: string,
    picks: Record<string, string>
  ) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId }, include: TOURNAMENT_INCLUDE });
    if (!tournament) throw createError.notFound('Tournament not found');
    if (tournament.status !== SlotWorldCupStatus.PREDICTIONS_OPEN) {
      throw createError.badRequest('Predictions are not open for this tournament');
    }

    const { normalizedPicks, finalKey } = this.validateAndNormalizePicks(tournament, picks);

    return prisma.slotWorldCupPrediction.upsert({
      where: { tournamentId_userId: { tournamentId, userId } },
      create: {
        tournamentId,
        userId,
        displayName,
        picks: normalizedPicks as unknown as Prisma.InputJsonValue,
        championPickId: normalizedPicks[finalKey] ?? null,
      },
      update: {
        displayName,
        picks: normalizedPicks as unknown as Prisma.InputJsonValue,
        championPickId: normalizedPicks[finalKey] ?? null,
        submittedAt: new Date(),
      },
    });
  }

  // Every match must have a pick; round-1 picks must be one of the two real
  // entrants (or the forced bye winner); every later-round pick must equal one
  // of the user's own two feeder-round picks — this is what prevents
  // "impossible" brackets without needing the live tournament result.
  private static validateAndNormalizePicks(tournament: TournamentWithRelations, picks: Record<string, string>) {
    const matchesByKey = new Map(tournament.matches.map((m) => [matchKey(m.round, m.matchNumber), m]));
    const normalized: Record<string, string> = {};
    let finalKey = '';

    for (let round = 1; round <= tournament.totalRounds; round++) {
      const matchesInRound = tournament.matches.filter((m) => m.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
      for (const match of matchesInRound) {
        const key = matchKey(match.round, match.matchNumber);
        if (round === tournament.totalRounds) finalKey = key;

        let candidates: string[];
        if (round === 1) {
          // Byes are already resolved at bracket-generation time — force that pick.
          if (match.winnerId && (!match.slotAId || !match.slotBId)) {
            candidates = [match.winnerId];
          } else {
            candidates = [match.slotAId, match.slotBId].filter((v): v is string => !!v);
          }
        } else {
          const prevA = matchesByKey.get(matchKey(round - 1, match.matchNumber * 2));
          const prevB = matchesByKey.get(matchKey(round - 1, match.matchNumber * 2 + 1));
          const prevAKey = prevA ? matchKey(prevA.round, prevA.matchNumber) : null;
          const prevBKey = prevB ? matchKey(prevB.round, prevB.matchNumber) : null;
          candidates = [prevAKey ? normalized[prevAKey] : null, prevBKey ? normalized[prevBKey] : null].filter(
            (v): v is string => !!v
          );
        }

        const pick = picks[key];
        if (candidates.length === 1) {
          normalized[key] = candidates[0];
          continue;
        }
        if (!pick || !candidates.includes(pick)) {
          throw createError.badRequest(`Missing or invalid pick for match ${key} — bracket must be fully and validly completed`);
        }
        normalized[key] = pick;
      }
    }

    if (!finalKey) throw createError.badRequest('Tournament bracket is not fully generated');
    return { normalizedPicks: normalized, finalKey };
  }

  // ─── Admin: match resolution ──────────────────────────────────────────────

  // Admin enters bet + payout for both slots in one submit; the multiplier is
  // derived for each side and whichever is higher wins the matchup automatically.
  static async submitMatchResult(
    matchId: string,
    betA: number,
    payoutA: number,
    betB: number,
    payoutB: number,
    io?: SocketIOServer
  ) {
    const match = await prisma.slotWorldCupMatch.findUnique({ where: { id: matchId } });
    if (!match) throw createError.notFound('Match not found');
    if (match.completedAt) throw createError.badRequest('Match already has a result');
    if (!match.slotAId || !match.slotBId) throw createError.badRequest('Both slots must be set before entering a result');
    if (!(betA > 0) || !(betB > 0)) throw createError.badRequest('Bet amounts must be greater than 0');
    if (!(payoutA >= 0) || !(payoutB >= 0)) throw createError.badRequest('Payout amounts cannot be negative');

    const multiplierA = payoutA / betA;
    const multiplierB = payoutB / betB;
    // A dead-even multiplier (rare) falls back to whichever paid out more in raw terms.
    const winnerId =
      multiplierA === multiplierB ? (payoutA >= payoutB ? match.slotAId : match.slotBId) : multiplierA > multiplierB ? match.slotAId : match.slotBId;

    return this.resolveMatchWinner(matchId, winnerId, { betA, payoutA, multiplierA, betB, payoutB, multiplierB }, io, false);
  }

  private static async resolveMatchWinner(
    matchId: string,
    winnerId: string,
    result: { betA: number; payoutA: number; multiplierA: number; betB: number; payoutB: number; multiplierB: number } | undefined,
    io: SocketIOServer | undefined,
    isBye: boolean
  ) {
    const match = await prisma.slotWorldCupMatch.findUnique({ where: { id: matchId } });
    if (!match) throw createError.notFound('Match not found');
    if (match.completedAt && !isBye) throw createError.badRequest('Match already has a result');
    if (![match.slotAId, match.slotBId].includes(winnerId)) throw createError.badRequest('Winner must be one of the two matchup slots');

    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: match.tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');

    const loserId = [match.slotAId, match.slotBId].find((id) => id && id !== winnerId) ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.slotWorldCupMatch.update({
        where: { id: matchId },
        data: {
          winnerId,
          completedAt: new Date(),
          ...(result
            ? {
                betAmountA: result.betA, payoutAmountA: result.payoutA, multiplierA: result.multiplierA,
                betAmountB: result.betB, payoutAmountB: result.payoutB, multiplierB: result.multiplierB,
              }
            : {}),
        },
      });
      if (loserId) await tx.slotWorldCupSlot.update({ where: { id: loserId }, data: { eliminatedRound: match.round } });
      if (match.nextMatchId && match.nextMatchSlot) {
        await tx.slotWorldCupMatch.update({
          where: { id: match.nextMatchId },
          data: match.nextMatchSlot === 'A' ? { slotAId: winnerId } : { slotBId: winnerId },
        });
      }
      // First real (non-bye) match resolution locks predictions for good.
      if (!isBye && tournament.status === SlotWorldCupStatus.PREDICTIONS_OPEN) {
        await tx.slotWorldCup.update({ where: { id: tournament.id }, data: { status: SlotWorldCupStatus.IN_PROGRESS } });
      }
      if (match.round > tournament.currentRound) {
        await tx.slotWorldCup.update({ where: { id: tournament.id }, data: { currentRound: match.round } });
      }
    });

    // Bye matches are structural, not real outcomes — nobody predicted them, so skip scoring.
    if (!isBye) {
      await this.scorePredictionsForMatch(tournament.id, match.round, match.matchNumber, winnerId, tournament);
    }

    // Deciding the final does NOT auto-complete the tournament — that used to
    // happen here, but it meant the tournament vanished into history the
    // instant the last match was scored, before the admin had any chance to
    // set rewards. The final's winner is visible on the bracket immediately
    // (it's just match.winnerId); finishTournament() below is what the admin
    // triggers explicitly, and it's the only thing that sets championSlotId /
    // COMPLETED.

    const updated = await this.getById(tournament.id);
    io?.to(`slotWorldCup:${tournament.id}`).emit('slotWorldCup:updated', updated);
    return updated;
  }

  private static async scorePredictionsForMatch(
    tournamentId: string,
    round: number,
    matchNumber: number,
    winnerId: string,
    tournament: { scoringConfig: Prisma.JsonValue; totalRounds: number }
  ) {
    const key = matchKey(round, matchNumber);
    const config = tournament.scoringConfig as unknown as ScoringConfig;
    const predictions = await prisma.slotWorldCupPrediction.findMany({ where: { tournamentId } });
    if (predictions.length === 0) return;

    const correctPredictors = predictions.filter((p) => (p.picks as Record<string, string>)[key] === winnerId);
    const pickedWinnerPercent = (correctPredictors.length / predictions.length) * 100;
    const isUpset = pickedWinnerPercent < config.upsetThresholdPercent;
    const basePoints = pointsForRound(round, tournament.totalRounds, config);
    // Exclude byes: they are auto-completed at bracket generation and nobody
    // predicts them, so counting them would permanently cap accuracy below 1 for
    // non-power-of-two brackets (e.g. size 12). A bye is a round-1 match missing
    // one entrant; every real match has both slots set.
    const decidedMatchesCount = await prisma.slotWorldCupMatch.count({
      where: { tournamentId, completedAt: { not: null }, slotAId: { not: null }, slotBId: { not: null } },
    });

    await prisma.$transaction(
      predictions.map((p) => {
        const picked = (p.picks as Record<string, string>)[key] === winnerId;
        const pointsDelta = picked ? basePoints + (isUpset ? config.upsetBonusPoints : 0) : 0;
        const correctPicks = p.correctPicks + (picked ? 1 : 0);
        return prisma.slotWorldCupPrediction.update({
          where: { id: p.id },
          data: {
            score: p.score + pointsDelta,
            correctPicks,
            accuracy: decidedMatchesCount > 0 ? correctPicks / decidedMatchesCount : 0,
          },
        });
      })
    );
  }

  /**
   * Admin-triggered: ends the tournament, crowns the champion, and pays out the
   * rewards the admin just entered for 1st/2nd/3rd (or however many ranks they
   * set — the mapping is whatever `rewards` contains).
   *
   * Requires the final match to already have a winner — deciding the final only
   * records that match's result; it does not by itself end the tournament, so an
   * admin always gets a deliberate moment to set the payout before the board is
   * final and coins go out.
   */
  static async finishTournament(
    tournamentId: string,
    rewards: Record<string, number>,
    io?: SocketIOServer
  ) {
    const tournament = await this.requireStatus(tournamentId, [
      SlotWorldCupStatus.IN_PROGRESS,
      SlotWorldCupStatus.PREDICTIONS_OPEN,
    ]);

    const final = await prisma.slotWorldCupMatch.findFirst({
      where: { tournamentId, round: tournament.totalRounds },
    });
    if (!final?.winnerId) {
      throw createError.badRequest('Decide the final match before ending the tournament');
    }
    const championId = final.winnerId;
    const runnerUpId = [final.slotAId, final.slotBId].find((id) => id && id !== championId) ?? null;

    const ranks: Record<string, number> = {};
    for (const [rank, coins] of Object.entries(rewards)) {
      const n = Number(coins);
      if (!Number.isFinite(n) || n < 0) {
        throw createError.badRequest(`Reward for rank ${rank} must be a non-negative number`);
      }
      if (n > 0) ranks[rank] = Math.round(n);
    }

    await this.completeTournament(tournamentId, championId, runnerUpId, { ranks }, io);
    return this.getById(tournamentId);
  }

  private static async completeTournament(
    tournamentId: string,
    championId: string,
    runnerUpId: string | null,
    rewardConfig: RewardConfig,
    io?: SocketIOServer
  ) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) return;
    const config = tournament.scoringConfig as unknown as ScoringConfig;
    // Scoreable = every match except round-1 byes (a bye has a missing entrant).
    // Using the raw match count would make the perfect-bracket bonus impossible
    // to earn on size-12 brackets, since byes never add to correctPicks.
    const byeCount = await prisma.slotWorldCupMatch.count({
      where: { tournamentId, round: 1, OR: [{ slotAId: null }, { slotBId: null }] },
    });
    const totalMatches = (await prisma.slotWorldCupMatch.count({ where: { tournamentId } })) - byeCount;

    const predictions = await prisma.slotWorldCupPrediction.findMany({ where: { tournamentId } });
    await prisma.$transaction([
      prisma.slotWorldCup.update({
        where: { id: tournamentId },
        data: {
          status: SlotWorldCupStatus.COMPLETED,
          championSlotId: championId,
          runnerUpSlotId: runnerUpId,
          closedAt: new Date(),
          // Record what the admin actually decided to pay, not the tournament's
          // creation-time default — this is what the leaderboard/export shows
          // afterward, and what the payout loop below reads.
          rewardConfig: rewardConfig as unknown as Prisma.InputJsonValue,
        },
      }),
      ...predictions.map((p) => {
        const bonus = p.correctPicks >= totalMatches ? config.perfectBracketBonus : 0;
        return bonus > 0
          ? prisma.slotWorldCupPrediction.update({ where: { id: p.id }, data: { score: p.score + bonus } })
          : prisma.slotWorldCupPrediction.update({ where: { id: p.id }, data: {} });
      }),
    ]);

    const leaderboard = await this.getLeaderboard(tournamentId);
    for (const entry of leaderboard) {
      const coins = rewardConfig.ranks[String(entry.rank)];
      if (!coins) continue;
      try {
        await PointsService.addPoints({
          userId: entry.userId,
          amount: coins,
          reason: `Slot World Cup — finished #${entry.rank}`,
          referenceId: tournamentId,
          referenceType: 'slot_world_cup',
        });
      } catch (err) {
        logger.warn('SlotWorldCupService: failed to award rewards', { userId: entry.userId, error: (err as Error).message });
      }
    }

    io?.to(`slotWorldCup:${tournamentId}`).emit('slotWorldCup:completed', { tournamentId, championId, runnerUpId });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private static async requireStatus(tournamentId: string, allowed: SlotWorldCupStatus[]) {
    const tournament = await prisma.slotWorldCup.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw createError.notFound('Tournament not found');
    if (!allowed.includes(tournament.status)) {
      throw createError.badRequest(`This action isn't valid while the tournament is ${tournament.status}`);
    }
    return tournament;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
