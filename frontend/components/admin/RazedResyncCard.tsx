"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { wagerLeaderboardApi } from "@/lib/api/wagerLeaderboard";

/**
 * Manual "pull wager figures from Razed now" control.
 *
 * The wager leaderboards are hardcoded and no longer have an admin screen, but
 * this action doesn't touch a race's schedule or prizes — it only re-reads
 * wager data from Razed's API — so it lives on the dashboard rather than being
 * dropped along with the rest of that page.
 */
export default function RazedResyncCard() {
  const [resyncing, setResyncing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResync = async () => {
    setResyncing(true);
    setMsg(null);
    try {
      const { alreadyRunning } = await wagerLeaderboardApi.resync();
      setMsg({
        type: "success",
        text: alreadyRunning
          ? "A resync is already running — waiting for it to finish…"
          : "Resync started — this walks every day since launch and can take a couple of minutes…",
      });

      // Runs in the background server-side (too slow for one request), so poll
      // for completion rather than waiting on the initial POST.
      const poll = async () => {
        const status = await wagerLeaderboardApi.resyncStatus();
        if (status.running) {
          setTimeout(poll, 3000);
          return;
        }
        setResyncing(false);
        if (status.error) {
          setMsg({ type: "error", text: `Resync failed: ${status.error}` });
        } else if (status.result && status.result.failedDays.length > 0) {
          setMsg({
            type: "error",
            text: `Resynced ${status.result.syncedDays} day(s), but ${status.result.failedDays.length} failed (Razed API rate-limited or unreachable): ${status.result.failedDays.join(", ")}. Try again in a minute.`,
          });
        } else if (status.result) {
          setMsg({ type: "success", text: `Resynced from Razed (${status.result.syncedDays} day(s)).` });
        }
      };
      setTimeout(poll, 3000);
    } catch {
      setMsg({ type: "error", text: "Resync failed to start." });
      setResyncing(false);
    }
  };

  return (
    <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">Razed Wager Sync</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
            Wagers sync automatically every 5 minutes. Use this to force an immediate
            re-pull of every day since launch.
          </p>
        </div>
        <button
          onClick={handleResync}
          disabled={resyncing}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 font-semibold px-4 py-2 rounded-xl text-sm transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? "animate-spin" : ""}`} />
          {resyncing ? "Syncing…" : "Resync from Razed"}
        </button>
      </div>

      {msg && (
        <div
          className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            msg.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
