"use client";

import { useState } from "react";
import LeaderboardContent from "./LeaderboardContent";
import type { ActiveRace, RaceHistoryEntry } from "@/lib/api/wagerLeaderboard";

type RaceInitialData = { race: ActiveRace | null; history: RaceHistoryEntry[] } | null;

interface Props {
  monthlyInitialData: RaceInitialData;
  weeklyInitialData: RaceInitialData;
}

const TABS: { key: "monthly" | "weekly"; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
];

export default function LeaderboardTabs({ monthlyInitialData, weeklyInitialData }: Props) {
  // Monthly stays the default tab, matching the page's pre-split behavior for
  // anyone who already has /leaderboard bookmarked or linked.
  const [tab, setTab] = useState<"monthly" | "weekly">("monthly");

  return (
    <div className="min-h-screen">
      {/* pt-20 clears the fixed navbar — LeaderboardContent below no longer
          adds its own top padding since this tab bar now sits above it. */}
      <div className="flex justify-center pt-20">
        <div className="inline-flex bg-navy-800/60 border border-white/8 rounded-full p-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-gold-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "monthly" ? (
        <LeaderboardContent type="MONTHLY" initialData={monthlyInitialData} />
      ) : (
        <LeaderboardContent type="WEEKLY" initialData={weeklyInitialData} />
      )}
    </div>
  );
}
