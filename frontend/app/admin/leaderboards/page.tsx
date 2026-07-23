"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { wagerLeaderboardApi, RaceType } from "@/lib/api/wagerLeaderboard";
import LeaderboardTypePanel from "./LeaderboardTypePanel";

const TABS: { key: RaceType; label: string }[] = [
  { key: "MONTHLY", label: "Monthly" },
  { key: "WEEKLY", label: "Weekly" },
];

export default function AdminLeaderboardsPage() {
  const [tab, setTab] = useState<RaceType>("MONTHLY");
  const [resyncing, setResyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResync = async () => {
    setResyncing(true); setMsg(null);
    try {
      const result = await wagerLeaderboardApi.resync();
      setRefreshKey((k) => k + 1);
      if (result.failedDays.length > 0) {
        setMsg({
          type: "error",
          text: `Resynced ${result.syncedDays} day(s), but ${result.failedDays.length} failed (Razed API rate-limited or unreachable): ${result.failedDays.join(", ")}. Try again in a minute.`,
        });
      } else {
        setMsg({ type: "success", text: `Resynced from Razed (${result.syncedDays} day(s)).` });
      }
    } catch {
      setMsg({ type: "error", text: "Resync failed." });
    } finally { setResyncing(false); }
  };

  return (
    <div className="pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">← Admin</a>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-bold text-xl">Wager Leaderboards</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResync}
              disabled={resyncing}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? "animate-spin" : ""}`} />
              {resyncing ? "Syncing…" : "Resync from Razed"}
            </button>
            <a href="/leaderboard" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View Public Page
            </a>
          </div>
        </div>

        {msg && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {/* Weekly / Monthly tabs — independent races, independent prizes */}
        <div className="inline-flex bg-navy-800/60 border border-white/8 rounded-full p-1 gap-1 mb-6">
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

        <LeaderboardTypePanel key={`${tab}-${refreshKey}`} type={tab} />

        {/* Full "who's under our Razed code" list now lives at /admin/razed-users */}
      </div>
    </div>
  );
}
