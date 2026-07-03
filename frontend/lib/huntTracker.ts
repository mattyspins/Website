import { API_ENDPOINTS } from "@/lib/api";

export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD";
export type BadgeType = "none" | "super_bonus" | "five_scatter" | "custom";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$",
};

export interface HuntBonus {
  id: string;
  slotName: string;
  provider: string;
  image: string;
  betSize: number;
  payout: number | null;
  badge: BadgeType;
  customBadge?: string;
  note?: string;
  requestedBy?: string;
  addedAt: string;
}

export interface Hunt {
  id: string;
  name: string;
  date: string;
  currency: Currency;
  startCost: number;
  bonuses: HuntBonus[];
  createdAt: string;
  isStarted: boolean;
  isCompleted?: boolean;
  gtbGameId?: string;
}

const STORAGE_KEY = "mattyspins_hunts";

export function loadHunts(): Hunt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHunts(hunts: Hunt[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hunts));
}

export function getHunt(id: string): Hunt | null {
  return loadHunts().find((h) => h.id === id) ?? null;
}

export function upsertHunt(hunt: Hunt): void {
  const hunts = loadHunts();
  const idx = hunts.findIndex((h) => h.id === hunt.id);
  if (idx >= 0) hunts[idx] = hunt;
  else hunts.unshift(hunt);
  saveHunts(hunts);
}

export function deleteHunt(id: string): void {
  saveHunts(loadHunts().filter((h) => h.id !== id));
}

/* ── Server sync (shared across admins/mods) ────────────────
   Local storage stays the source of truth for instant UI updates;
   these functions keep it in sync with the backend so every
   admin/mod sees hunts created on other devices/browsers. ── */

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fromServerHunt(h: any): Hunt {
  return {
    id: h.id,
    name: h.name,
    date: h.date,
    currency: h.currency,
    startCost: Number(h.startCost),
    bonuses: h.bonuses ?? [],
    createdAt: h.createdAt,
    isStarted: h.isStarted,
    isCompleted: h.isCompleted,
    gtbGameId: h.gtbGameId ?? undefined,
  };
}

/** Pulls every hunt from the server and merges it into local storage (server wins per-id). */
export async function syncHuntsFromServer(): Promise<Hunt[]> {
  try {
    const res = await fetch(API_ENDPOINTS.HUNTS, { headers: authHeaders() });
    if (!res.ok) return loadHunts();
    const data = await res.json();
    const serverHunts: Hunt[] = (data.hunts ?? []).map(fromServerHunt);
    const byId = new Map(loadHunts().map((h) => [h.id, h]));
    for (const h of serverHunts) byId.set(h.id, h);
    const merged = Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    saveHunts(merged);
    return merged;
  } catch {
    return loadHunts();
  }
}

/** Fetches a single hunt from the server — used when it isn't in local storage yet (e.g. created by another admin). */
export async function fetchHuntFromServer(id: string): Promise<Hunt | null> {
  try {
    const res = await fetch(API_ENDPOINTS.HUNT(id), { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.hunt ? fromServerHunt(data.hunt) : null;
  } catch {
    return null;
  }
}

export function pushHuntToServer(hunt: Hunt): void {
  fetch(API_ENDPOINTS.HUNT(hunt.id), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(hunt),
  }).catch(() => {});
}

export function deleteHuntOnServer(id: string): void {
  fetch(API_ENDPOINTS.HUNT(id), { method: "DELETE", headers: authHeaders() }).catch(() => {});
}

/* ── Computed stats ──────────────────────────────────────── */

export interface HuntStats {
  bonusCount: number;
  startCost: number;
  winnings: number;
  profitLoss: number;
  avgReq: number;
  curAvg: number;
  totalX: number;
  reqX: number;
  curAvgX: number;
}

export function calcHuntStats(hunt: Hunt): HuntStats {
  const opened = hunt.bonuses.filter((b) => b.payout !== null);
  const winnings = opened.reduce((s, b) => s + (b.payout ?? 0), 0);
  const bonusCount = hunt.bonuses.length;
  const avgBet = bonusCount > 0
    ? hunt.bonuses.reduce((s, b) => s + b.betSize, 0) / bonusCount
    : 0;
  const avgReq = bonusCount > 0 ? hunt.startCost / bonusCount : 0;
  const curAvg = opened.length > 0 ? winnings / opened.length : 0;
  const totalX = hunt.startCost > 0 ? winnings / hunt.startCost : 0;
  const reqX = avgBet > 0 ? avgReq / avgBet : 0;
  const curAvgX = avgBet > 0 ? curAvg / avgBet : 0;

  return {
    bonusCount,
    startCost: hunt.startCost,
    winnings,
    profitLoss: winnings - hunt.startCost,
    avgReq,
    curAvg,
    totalX,
    reqX,
    curAvgX,
  };
}

export interface GlobalStats {
  huntCount: number;
  totalCost: number;
  totalWinnings: number;
  pnl: number;
  highestWin: { value: number; slotName: string; provider: string; image: string } | null;
  highestMulti: { value: number; slotName: string; provider: string; image: string } | null;
  lowestMulti: { value: number; slotName: string; provider: string; image: string } | null;
}

export function calcGlobalStats(hunts: Hunt[]): GlobalStats {
  let totalCost = 0;
  let totalWinnings = 0;
  let highestWin: GlobalStats["highestWin"] = null;
  let highestMulti: GlobalStats["highestMulti"] = null;
  let lowestMulti: GlobalStats["lowestMulti"] = null;

  for (const hunt of hunts) {
    totalCost += hunt.startCost;
    for (const b of hunt.bonuses) {
      if (b.payout === null) continue;
      totalWinnings += b.payout;
      const multi = b.betSize > 0 ? b.payout / b.betSize : 0;
      if (!highestWin || b.payout > highestWin.value)
        highestWin = { value: b.payout, slotName: b.slotName, provider: b.provider, image: b.image };
      if (!highestMulti || multi > highestMulti.value)
        highestMulti = { value: multi, slotName: b.slotName, provider: b.provider, image: b.image };
      if (!lowestMulti || multi < lowestMulti.value)
        lowestMulti = { value: multi, slotName: b.slotName, provider: b.provider, image: b.image };
    }
  }

  return {
    huntCount: hunts.length,
    totalCost,
    totalWinnings,
    pnl: totalWinnings - totalCost,
    highestWin,
    highestMulti,
    lowestMulti,
  };
}

export function fmt(val: number, currency: Currency = "USD"): string {
  const sym = CURRENCY_SYMBOLS[currency];
  return `${sym}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtMulti(val: number): string {
  return `${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}
