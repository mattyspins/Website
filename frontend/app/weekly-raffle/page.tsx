import type { Metadata } from "next";
import WeeklyRaffleContent from "./WeeklyRaffleContent";
import { API_URL } from "@/lib/api";
import type { WeeklyRaffle } from "@/lib/api/weeklyRaffle";

export const metadata: Metadata = {
  title: "Weekly Raffle",
  description: "This week's raffle requirements, entrants, and past winners.",
  alternates: { canonical: "/weekly-raffle" },
};

/**
 * Both endpoints are public (no auth) — only the per-viewer eligibility check
 * needs a token, and that stays client-only in WeeklyRaffleContent. Any
 * failure returns undefined, which preserves the component's original
 * `raffle: undefined` "still loading" sentinel exactly as before.
 */
async function getInitialData(): Promise<{ raffle: WeeklyRaffle | null; history: WeeklyRaffle[] } | undefined> {
  try {
    const [currentRes, historyRes] = await Promise.all([
      fetch(`${API_URL}/api/weekly-raffle/current`, { cache: "no-store" }),
      fetch(`${API_URL}/api/weekly-raffle/history?limit=10`, { cache: "no-store" }),
    ]);
    if (!currentRes.ok || !historyRes.ok) return undefined;
    const [currentJson, historyJson] = await Promise.all([currentRes.json(), historyRes.json()]);
    if (!currentJson.success || !historyJson.success) return undefined;
    return { raffle: currentJson.raffle ?? null, history: historyJson.history ?? [] };
  } catch {
    return undefined;
  }
}

export default async function Page() {
  const initialData = await getInitialData();
  return <WeeklyRaffleContent initialData={initialData} />;
}
