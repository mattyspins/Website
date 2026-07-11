// Pure calculation engine for the Community Boss Raid feature — every boss's
// passive ability is a branch in resolveRound/resolveDeadBonus rather than a
// separate service file, keyed by BossKey. Ported directly from an approved
// interactive reference prototype (numbers/thresholds are intentional design,
// not placeholders).

export type BossKey = "inferno" | "frost" | "storm" | "shadow" | "mecha" | "void";

export interface BossConfig {
  key: BossKey;
  name: string;
  icon: string;
  passiveName: string;
  description: string;
  hue: number;
  chroma: number;
}

export const BOSS_ROSTER: Record<BossKey, BossConfig> = {
  inferno: {
    key: "inferno",
    name: "Inferno Dragon",
    icon: "🔥",
    passiveName: "Molten Armor",
    description:
      "Molten Armor: reduces incoming damage 20%. Every 5th bonus round it sheds armor, taking +50% damage for that hit.",
    hue: 35,
    chroma: 0.19,
  },
  frost: {
    key: "frost",
    name: "Frost Titan",
    icon: "❄",
    passiveName: "Frozen Heart",
    description:
      "Frozen Heart: every 3rd bonus freezes the raid, disabling crits that round. Only stunnable by 500×+.",
    hue: 222,
    chroma: 0.13,
  },
  storm: {
    key: "storm",
    name: "Storm Colossus",
    icon: "⚡",
    passiveName: "Chain Lightning",
    description: "Chain Lightning: retriggers deal ×3 instead of ×2. Dead Bonuses charge its Rage Meter.",
    hue: 290,
    chroma: 0.16,
  },
  shadow: {
    key: "shadow",
    name: "Shadow Reaper",
    icon: "☠",
    passiveName: "Soul Drain",
    description:
      "Soul Drain: Dead Bonuses heal 250 HP. Every 500× breaks a Soul Shield, making the boss more vulnerable.",
    hue: 302,
    chroma: 0.14,
  },
  mecha: {
    key: "mecha",
    name: "Mecha Overlord",
    icon: "🤖",
    passiveName: "Adaptive Shield",
    description:
      "Adaptive Shield: repeated multiplier ranges deal less damage. Land a variety of multipliers to break through.",
    hue: 220,
    chroma: 0.13,
  },
  void: {
    key: "void",
    name: "Void Leviathan",
    icon: "🌌",
    passiveName: "Reality Distortion",
    description:
      "Reality Distortion: a random raid modifier rotates every few rounds — retriggers, heals, stuns and buffs all shift.",
    hue: 322,
    chroma: 0.16,
  },
};

export const VOID_MODIFIERS = [
  { id: "retrigger3x", label: "Retriggers deal ×3" },
  { id: "deadheal50", label: "Dead Bonus heals only 50" },
  { id: "stun500", label: "500× instantly stuns" },
  { id: "globaldmg25", label: "Global damage +25%" },
  { id: "doublecrit", label: "Double critical damage" },
] as const;

export function isBossKey(value: string): value is BossKey {
  return value in BOSS_ROSTER;
}

export interface BossPassiveState {
  currentHp: number;
  maxHp: number;
  phase: number;
  rage: number;
  roundCount: number;
  consecutiveBucket: string | null;
  consecutiveCount: number;
  legendaryBuffRounds: number;
  soulShields: number;
  voidModifier: string | null;
  voidModifierRoundsLeft: number;
}

function bucketOf(mult: number): string {
  if (mult < 100) return "low";
  if (mult < 500) return "mid";
  if (mult < 1000) return "high";
  return "legendary";
}

function phaseFor(hp: number, maxHp: number): number {
  const pct = (hp / maxHp) * 100;
  if (pct <= 25) return 4;
  if (pct <= 50) return 3;
  if (pct <= 75) return 2;
  return 1;
}

const PHASE_LABELS: Record<number, string> = { 1: "STABLE", 2: "AWAKENED", 3: "ENRAGED", 4: "FINAL PHASE" };

function rotateVoid(boss: BossKey, state: BossPassiveState): Partial<BossPassiveState> & { bannerText?: string } {
  if (boss !== "void") return {};
  const left = state.voidModifierRoundsLeft - 1;
  if (left <= 0) {
    const m = VOID_MODIFIERS[Math.floor(Math.random() * VOID_MODIFIERS.length)];
    return { voidModifier: m.id, voidModifierRoundsLeft: 3, bannerText: `🌌 DISTORTION: ${m.label.toUpperCase()}` };
  }
  return { voidModifierRoundsLeft: left };
}

export interface DeadBonusResult {
  healApplied: number;
  updatedState: Partial<BossPassiveState>;
  bannerText: string | null;
}

// Dead Bonus is the one standalone special-event action — no bet/win, no damage,
// just a flat heal (boss-overridable) applied directly.
export function resolveDeadBonus(boss: BossKey, state: BossPassiveState): DeadBonusResult {
  let heal = 100;
  if (boss === "shadow") heal = 250;
  if (boss === "void" && state.voidModifier === "deadheal50") heal = 50;

  const newHp = Math.min(state.maxHp, state.currentHp + heal);
  const rageAdd = boss === "storm" ? 25 : 0;
  const newRage = Math.min(100, state.rage + rageAdd);
  const { bannerText, ...voidRotation } = rotateVoid(boss, state);

  return {
    healApplied: heal,
    bannerText: bannerText ?? null,
    updatedState: {
      currentHp: newHp,
      rage: newRage,
      consecutiveBucket: null,
      consecutiveCount: 0,
      roundCount: state.roundCount + 1,
      ...voidRotation,
    },
  };
}

export interface RoundInput {
  multiplier: number;
  isRetrigger: boolean;
}

export interface RoundResult {
  damageDealt: number;
  newHp: number;
  newPhase: number;
  phaseChanged: boolean;
  // multiplier >= 500 — universal "stun-worthy" threshold, shown as a status/weakness cue.
  isStunThreshold: boolean;
  // multiplier >= 1000 — universal "legendary" threshold.
  isLegendary: boolean;
  // whether the retrigger bonus actually applied (admin flagged it AND Frost's freeze didn't block it).
  isRetriggerApplied: boolean;
  frozenThisRound: boolean;
  infernoArmorShed: boolean;
  bannerText: string | null;
  updatedState: Partial<BossPassiveState>;
}

export function resolveRound(boss: BossKey, state: BossPassiveState, input: RoundInput): RoundResult {
  const roundNo = state.roundCount + 1;
  const bucket = bucketOf(input.multiplier);
  const consCount = state.consecutiveBucket === bucket ? state.consecutiveCount + 1 : 1;
  let dmg = input.multiplier;

  let critMult = boss === "storm" ? 3 : 2;
  if (boss === "void" && state.voidModifier === "retrigger3x") critMult = 3;
  if (boss === "void" && state.voidModifier === "doublecrit") critMult = 4;
  const frozenThisRound = boss === "frost" && roundNo % 3 === 0;
  const retriggerApplied = input.isRetrigger && !frozenThisRound;
  if (retriggerApplied) dmg = input.multiplier * critMult;
  const legendary = input.multiplier >= 1000;

  if (state.legendaryBuffRounds > 0) dmg = Math.round(dmg * 1.25);
  if (boss === "void" && state.voidModifier === "globaldmg25") dmg = Math.round(dmg * 1.25);

  let infernoShed = false;
  if (boss === "inferno") {
    infernoShed = roundNo % 5 === 0;
    dmg = Math.round(dmg * (infernoShed ? 1.5 : 0.8));
  }
  if (boss === "shadow") dmg = Math.round(dmg * (1 - state.soulShields * 0.12));
  if (boss === "mecha") {
    const reduction = consCount >= 2 ? Math.min(0.6, (consCount - 1) * 0.2) : 0;
    dmg = Math.round(dmg * (1 - reduction));
  }
  dmg = Math.max(0, dmg);

  const newHp = Math.max(0, state.currentHp - dmg);
  const newPhase = phaseFor(newHp, state.maxHp);
  const phaseChanged = newPhase !== state.phase;
  const newRage = Math.min(100, state.rage + dmg * 0.04);
  const legendaryBuffRounds =
    boss === "mecha" && legendary ? 3 : Math.max(0, state.legendaryBuffRounds - (state.legendaryBuffRounds > 0 ? 1 : 0));

  let soulShields = state.soulShields;
  const stunThreshold = input.multiplier >= 500;
  if (boss === "shadow" && stunThreshold && soulShields > 0) soulShields -= 1;

  const { bannerText: voidBanner, ...voidRotation } = rotateVoid(boss, state);

  let bannerText: string | null = null;
  if (stunThreshold) bannerText = "⚡ BOSS STUNNED";
  if (legendary) bannerText = "⚡ LEGENDARY STRIKE";
  if (infernoShed) bannerText = "🔥 ARMOR SHED";
  if (voidBanner) bannerText = voidBanner;
  if (phaseChanged) bannerText = `PHASE ${newPhase} — ${PHASE_LABELS[newPhase] ?? ""}`;

  return {
    damageDealt: dmg,
    newHp,
    newPhase,
    phaseChanged,
    isStunThreshold: stunThreshold,
    isLegendary: legendary,
    isRetriggerApplied: retriggerApplied,
    frozenThisRound,
    infernoArmorShed: infernoShed,
    bannerText,
    updatedState: {
      currentHp: newHp,
      phase: newPhase,
      rage: Math.round(newRage >= 100 ? 0 : newRage),
      roundCount: roundNo,
      consecutiveBucket: bucket,
      consecutiveCount: consCount,
      legendaryBuffRounds,
      soulShields,
      ...voidRotation,
    },
  };
}

export function initialPassiveState(bossKey: BossKey, maxHp: number): BossPassiveState {
  const state: BossPassiveState = {
    currentHp: maxHp,
    maxHp,
    phase: 1,
    rage: 0,
    roundCount: 0,
    consecutiveBucket: null,
    consecutiveCount: 0,
    legendaryBuffRounds: 0,
    soulShields: 3,
    voidModifier: null,
    voidModifierRoundsLeft: 0,
  };
  if (bossKey === "void") {
    const m = VOID_MODIFIERS[Math.floor(Math.random() * VOID_MODIFIERS.length)];
    state.voidModifier = m.id;
    state.voidModifierRoundsLeft = 3;
  }
  return state;
}
