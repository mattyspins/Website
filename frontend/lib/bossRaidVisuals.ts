import type { BossConfig, BossRaid, BossRaidUser } from "@/lib/api/bossRaid";

export const QUICK_SLOTS = [
  { id: "sweetbonanza", name: "Sweet Bonanza", icon: "🍬" },
  { id: "gatesofolympus", name: "Gates of Olympus", icon: "⚡" },
  { id: "wanted", name: "Wanted", icon: "🤠" },
  { id: "sugarrush1000", name: "Sugar Rush 1000", icon: "🍭" },
  { id: "bigbass", name: "Big Bass Bonanza", icon: "🎣" },
  { id: "starlight", name: "Starlight Princess", icon: "✨" },
] as const;

export const PHASE_LABELS: Record<number, string> = { 1: "STABLE", 2: "AWAKENED", 3: "ENRAGED", 4: "FINAL PHASE" };

// Boss + phase driven palette — matches the approved reference design exactly: chroma/
// lightness intensify as the boss moves through its phases.
export function bossPalette(boss: BossConfig, phase: number) {
  const L = [0.74, 0.74, 0.71, 0.67][phase - 1] ?? 0.74;
  const C = boss.chroma + ([0, 0.02, 0.04, 0.05][phase - 1] ?? 0);
  const hue = boss.hue;
  const coreColor = `oklch(${L} ${C} ${hue})`;
  const coreColorLight = `oklch(${Math.min(0.92, L + 0.14)} ${Math.max(0.03, C - 0.03)} ${hue})`;
  const visorColor = coreColor;
  const hpBarGradient = `linear-gradient(90deg, oklch(${L} ${C} ${hue}), oklch(${Math.min(0.85, L + 0.06)} ${Math.max(0.05, C - 0.02)} ${hue + 25}))`;
  const hpBarGlow = `oklch(${L} ${C} ${hue} / 0.55)`;
  return { coreColor, coreColorLight, visorColor, hpBarGradient, hpBarGlow };
}

export interface StatusTag {
  label: string;
  hue: number;
  blink?: boolean;
}

// Per-boss status tags + weakness callout text, mirroring the reference's `mkTag`/weakness logic.
export function bossStatusInfo(raid: BossRaid): { tags: StatusTag[]; weaknessText: string; weaknessHot: boolean } {
  const tags: StatusTag[] = [];
  let weaknessText = "";
  let weaknessHot = false;

  if (raid.bossKey === "inferno") {
    const shedNext = (raid.roundCount + 1) % 5 === 0;
    tags.push({ label: shedNext ? "ARMOR SHED +50%" : "MOLTEN ARMOR −20%", hue: 35, blink: shedNext });
    weaknessText = shedNext ? "Armor is shedding — strike now for +50%!" : "Molten armor absorbs 20% — bait the shed round";
    weaknessHot = shedNext;
  } else if (raid.bossKey === "frost") {
    const froze = (raid.roundCount + 1) % 3 === 0;
    tags.push({ label: "FROZEN HEART", hue: 222 });
    if (froze) tags.push({ label: "FROZEN · NO CRIT", hue: 200, blink: true });
    weaknessText = froze ? "Frozen next round — crits disabled" : "Only 500×+ can stun the Titan";
    weaknessHot = froze;
  } else if (raid.bossKey === "storm") {
    tags.push({ label: "CHAIN LIGHTNING ×3", hue: 290 });
    weaknessText = "Retriggers deal ×3 — save your crits for big bets";
  } else if (raid.bossKey === "shadow") {
    tags.push({ label: `SOUL SHIELD ×${raid.soulShields}`, hue: 302 });
    weaknessText =
      raid.soulShields > 0 ? `Break ${raid.soulShields} Soul Shield${raid.soulShields > 1 ? "s" : ""} with 500×+` : "Shields shattered — fully vulnerable!";
    weaknessHot = raid.soulShields === 0;
  } else if (raid.bossKey === "mecha") {
    if (raid.consecutiveCount >= 2) tags.push({ label: `SHIELD RESIST ×${raid.consecutiveCount}`, hue: 220 });
    weaknessText = raid.consecutiveCount >= 3 ? "EXPOSED — vary your multipliers!" : "Repeated ranges lose power";
    weaknessHot = raid.consecutiveCount >= 3;
  } else if (raid.bossKey === "void") {
    tags.push({ label: "DISTORTION", hue: 322 });
    weaknessText = `Reality distorted: ${raid.voidModifier ?? "—"}`;
  }

  return { tags, weaknessText, weaknessHot };
}

export function hpPercent(raid: BossRaid): number {
  return Math.max(0, Math.min(100, (raid.currentHp / raid.maxHp) * 100));
}

export function phaseLabel(phase: number): string {
  return PHASE_LABELS[phase] ?? "STABLE";
}

export interface LeaderboardRow {
  entryId: string;
  user: BossRaidUser;
  slotName: string | null;
  damage: number;
}

// Ranked by total damage dealt, grouped by entry (each participant gets at most one
// turn per raid, so grouping by entryId is equivalent to grouping by participant).
export function computeLeaderboard(raid: BossRaid): LeaderboardRow[] {
  const byEntry = new Map<string, LeaderboardRow>();
  for (const round of raid.rounds) {
    const existing = byEntry.get(round.entryId);
    if (existing) {
      existing.damage += round.damageDealt;
      if (round.slotName) existing.slotName = round.slotName;
    } else {
      byEntry.set(round.entryId, {
        entryId: round.entryId,
        user: round.user,
        slotName: round.slotName,
        damage: round.damageDealt,
      });
    }
  }
  return Array.from(byEntry.values()).sort((a, b) => b.damage - a.damage);
}

export function raidStats(raid: BossRaid) {
  let totalDamage = 0;
  let biggestHit = 0;
  let highestMult = 0;
  let critCount = 0;
  for (const r of raid.rounds) {
    totalDamage += r.damageDealt;
    biggestHit = Math.max(biggestHit, r.damageDealt);
    if (r.multiplier) highestMult = Math.max(highestMult, Number(r.multiplier));
    if (r.isCrit || r.isLegendary) critCount += 1;
  }
  return { totalDamage, biggestHit, highestMult, critCount };
}
