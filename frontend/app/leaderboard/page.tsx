import type { Metadata } from "next";
import LeaderboardTabs from "./LeaderboardTabs";
import { API_URL } from "@/lib/api";
import type { ActiveRace, RaceHistoryEntry, RaceType } from "@/lib/api/wagerLeaderboard";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live weekly and monthly wager race standings for MattySpins — see who's on top and when the next payout lands.",
  alternates: { canonical: "/leaderboard" },
};

/**
 * Runs on the server before the page reaches the browser, so the leaderboard
 * (and its title/description) reflect real standings on first paint — for a
 * crawler, and for a viewer who currently sees a spinner until the client
 * fetch resolves. Fetched once per race type (Weekly and Monthly run as
 * fully independent races) so switching tabs client-side is instant.
 *
 * `cache: "no-store"` deliberately skips Next's data cache: the client's own
 * fetch already polls every 30s for freshness, and serving a stale cached
 * page here would just mean two different sources of truth. Any failure
 * (network blip, cold start) returns null, at which point LeaderboardContent
 * falls back to exactly its original behavior — this can only add a faster
 * first paint, never a new failure mode.
 */
async function getInitialData(type: RaceType): Promise<{ race: ActiveRace | null; history: RaceHistoryEntry[] } | null> {
  try {
    const [raceRes, historyRes] = await Promise.all([
      fetch(`${API_URL}/api/wager-leaderboard/active?type=${type}`, { cache: "no-store" }),
      fetch(`${API_URL}/api/wager-leaderboard/history?type=${type}`, { cache: "no-store" }),
    ]);
    if (!raceRes.ok || !historyRes.ok) return null;
    const [raceJson, historyJson] = await Promise.all([raceRes.json(), historyRes.json()]);
    if (!raceJson.success || !historyJson.success) return null;
    return { race: raceJson.race ?? null, history: historyJson.races ?? [] };
  } catch {
    return null;
  }
}

export default async function Page() {
  const [monthlyInitialData, weeklyInitialData] = await Promise.all([
    getInitialData("MONTHLY"),
    getInitialData("WEEKLY"),
  ]);
  return <LeaderboardTabs monthlyInitialData={monthlyInitialData} weeklyInitialData={weeklyInitialData} />;
}
