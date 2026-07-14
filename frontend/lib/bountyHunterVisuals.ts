import type { BountyHunter, BountyHunterRound, BountyHunterUser } from "@/lib/api/bountyHunter";

export interface HeatInfo {
  label: string;
  tier: number;
  color: string;
}

const HEAT_COLORS: Record<string, string> = {
  BULLSEYE: "oklch(0.86 0.16 80)",
  SCORCHING: "oklch(0.74 0.2 40)",
  "RED HOT": "oklch(0.66 0.22 28)",
  "IN THE ZONE": "oklch(0.82 0.15 65)",
  COLD: "oklch(0.66 0.13 230)",
  "ICE COLD": "oklch(0.6 0.1 250)",
};

const HEAT_TIERS: Record<string, number> = {
  BULLSEYE: 5,
  SCORCHING: 4,
  "RED HOT": 3,
  "IN THE ZONE": 2,
  COLD: 1,
  "ICE COLD": 0,
};

export function heatInfo(label: string | null): HeatInfo {
  const key = label ?? "ICE COLD";
  return { label: key, tier: HEAT_TIERS[key] ?? 0, color: HEAT_COLORS[key] ?? HEAT_COLORS["ICE COLD"] };
}

export interface BoardRow {
  entryId: string;
  roundId: string;
  user: BountyHunterUser;
  slotName: string | null;
  multiplier: string | null;
  heat: HeatInfo;
  epoch: number;
}

// Ranked by heat tier (closest to the secret target first) within the hunt's current
// epoch — rounds from earlier epochs (before the last rollover) are excluded, same as
// the backend's settle/board scoping.
export function computeBoard(hunt: BountyHunter): BoardRow[] {
  return hunt.rounds
    .filter((r): r is BountyHunterRound & { multiplier: string } => !r.skipped && !!r.playedAt && r.epoch === hunt.epoch && r.multiplier != null)
    .map((r) => ({
      entryId: r.entryId,
      roundId: r.id,
      user: r.user,
      slotName: r.slotName,
      multiplier: r.multiplier,
      heat: heatInfo(r.heat),
      epoch: r.epoch,
    }))
    .sort((a, b) => b.heat.tier - a.heat.tier);
}

export interface CareerRow {
  userId: string;
  name: string;
  bounties: number;
  coins: number;
}

// Bounty Hunter only ever has a winner recorded on the hunt itself once SETTLED, so a
// live "career leaderboard" spanning the currently-loaded history list is computed from
// each settled hunt's winning round.
export function computeCareerLeaderboard(history: BountyHunter[]): CareerRow[] {
  const totals = new Map<string, CareerRow>();
  for (const hunt of history) {
    if (hunt.status !== "SETTLED" || !hunt.winnerEntryId) continue;
    const round = hunt.rounds.find((r) => r.entryId === hunt.winnerEntryId && r.qualifies);
    if (!round) continue;
    const existing = totals.get(round.userId);
    if (existing) {
      existing.bounties += 1;
      existing.coins += hunt.pot;
    } else {
      totals.set(round.userId, { userId: round.userId, name: round.user.displayName, bounties: 1, coins: hunt.pot });
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.coins - a.coins);
}
