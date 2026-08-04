/**
 * Hardcoded wager race definitions.
 *
 * These races used to be created and edited by admins through /admin/leaderboards.
 * That UI is gone: the schedule and prize splits now live here in code, and
 * `WagerRaceScheduler` reconciles them into the `WagerRace` rows the standings,
 * payout and history code already read from. To change a race, edit this file
 * and deploy — there is deliberately no runtime path that can rewrite it.
 *
 * All wall-clock times below are Europe/London. The offset is resolved through
 * `Intl` rather than a fixed +1, so the rolling weekly window stays correct
 * across the BST/GMT transitions in late March and late October.
 */

const LONDON_TZ = 'Europe/London';

const LONDON_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

interface LondonParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The Europe/London wall-clock reading of a UTC instant. */
function londonPartsOf(instant: Date): LondonParts {
  const out: Record<string, number> = {};
  for (const part of LONDON_PARTS.formatToParts(instant)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  // Some ICU builds report midnight as hour 24 of the same calendar day.
  return { ...out, hour: (out['hour'] ?? 0) % 24 } as unknown as LondonParts;
}

/** How far ahead of UTC London is at `instant`, in ms (+1h during BST, 0 during GMT). */
function londonOffsetMs(instant: Date): number {
  const p = londonPartsOf(instant);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - instant.getTime();
}

/**
 * Resolves a Europe/London wall-clock time to the UTC instant it names.
 *
 * Two passes: the first guesses using the offset in force at the naive
 * timestamp, the second re-resolves using the offset actually in force at that
 * result. Without the second pass, a time within an hour of a DST boundary
 * lands an hour out.
 */
export function londonToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let ts = naiveUtc - londonOffsetMs(new Date(naiveUtc));
  ts = naiveUtc - londonOffsetMs(new Date(ts));
  return new Date(ts);
}

export type RaceType = 'WEEKLY' | 'MONTHLY';

export interface RacePrizeDef {
  position: number;
  amount: number;
}

export interface RaceDefinition {
  type: RaceType;
  startDate: Date;
  endDate: Date;
  totalPrizePool: number;
  prizes: RacePrizeDef[];
}

/** Turns a top-down list of prize amounts into positioned rows (index 0 becomes #1). */
function prizeLadder(amounts: number[]): RacePrizeDef[] {
  return amounts.map((amount, i) => ({ position: i + 1, amount }));
}

function sum(amounts: number[]): number {
  return amounts.reduce((total, n) => total + n, 0);
}

// ─── Monthly: $1,200, fixed window ───────────────────────────────────────────
// 1 Aug 2026 00:00 London through 30 Aug 2026 00:00 London.
const MONTHLY_PRIZE_AMOUNTS = [500, 250, 150, 100, 75, 35, 30, 25, 20, 15];
const MONTHLY_START = londonToUtc(2026, 8, 1, 0, 0);
const MONTHLY_END = londonToUtc(2026, 8, 30, 0, 0);

// ─── Weekly: $100, rolling Monday to Monday ──────────────────────────────────
const WEEKLY_PRIZE_AMOUNTS = [40, 25, 20, 15];

// A mismatch here would be rejected downstream anyway; failing at import time
// makes a bad edit obvious on boot instead of silently at the next payout.
for (const [label, amounts, pool] of [
  ['monthly', MONTHLY_PRIZE_AMOUNTS, 1200],
  ['weekly', WEEKLY_PRIZE_AMOUNTS, 100],
] as const) {
  if (sum(amounts) !== pool) {
    throw new Error(
      `wagerRaces: ${label} prize amounts sum to ${sum(amounts)}, expected ${pool}`
    );
  }
}

export function monthlyRace(): RaceDefinition {
  return {
    type: 'MONTHLY',
    startDate: MONTHLY_START,
    endDate: MONTHLY_END,
    totalPrizePool: sum(MONTHLY_PRIZE_AMOUNTS),
    prizes: prizeLadder(MONTHLY_PRIZE_AMOUNTS),
  };
}

/**
 * The Monday-to-Monday London week containing `now`. Start is inclusive, end is
 * the following Monday 00:00 — so a week's end instant is exactly the next
 * week's start instant, leaving no uncovered gap between consecutive races.
 */
export function currentWeekWindow(now: Date = new Date()): { start: Date; end: Date } {
  const p = londonPartsOf(now);
  // Day-of-week of London's calendar date (0=Sun). A UTC proxy date is used
  // purely as a weekday calculator, so the server's own zone never leaks in.
  const dayOfWeek = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - daysSinceMonday));
  const nextMonday = new Date(Date.UTC(p.year, p.month - 1, p.day - daysSinceMonday + 7));

  return {
    start: londonToUtc(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate()),
    end: londonToUtc(nextMonday.getUTCFullYear(), nextMonday.getUTCMonth() + 1, nextMonday.getUTCDate()),
  };
}

export function weeklyRace(now: Date = new Date()): RaceDefinition {
  const { start, end } = currentWeekWindow(now);
  return {
    type: 'WEEKLY',
    startDate: start,
    endDate: end,
    totalPrizePool: sum(WEEKLY_PRIZE_AMOUNTS),
    prizes: prizeLadder(WEEKLY_PRIZE_AMOUNTS),
  };
}

/** Both races as they should exist right now. */
export function currentRaceDefinitions(now: Date = new Date()): RaceDefinition[] {
  return [monthlyRace(), weeklyRace(now)];
}
