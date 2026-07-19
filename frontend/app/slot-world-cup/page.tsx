"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { slotWorldCupApi } from "@/lib/api/slotWorldCup";
import SlotWorldCupBracket from "@/components/SlotWorldCupBracket";
import {
  SlotWorldCup,
  SlotWorldCupStatus,
  SlotWorldCupNominationRanking,
  SlotWorldCupLeaderboardEntry,
  SlotWorldCupPrediction,
} from "@/types/slotWorldCup";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { isAuthenticated } from "@/lib/authPersistence";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function StatusBadge({ status }: { status: SlotWorldCupStatus }) {
  const map: Record<SlotWorldCupStatus, { label: string; cls: string }> = {
    [SlotWorldCupStatus.NOMINATION]: { label: "Nominations Open", cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse" },
    [SlotWorldCupStatus.BRACKET_SET]: { label: "Bracket Set", cls: "bg-white/8 text-white/50" },
    [SlotWorldCupStatus.PREDICTIONS_OPEN]: { label: "Predictions Open", cls: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 animate-pulse" },
    [SlotWorldCupStatus.IN_PROGRESS]: { label: "Live", cls: "bg-green-500/20 text-green-300 border border-green-500/30" },
    [SlotWorldCupStatus.COMPLETED]: { label: "Completed", cls: "bg-white/8 text-white/40" },
    [SlotWorldCupStatus.CANCELLED]: { label: "Cancelled", cls: "bg-red-500/10 text-red-400" },
  };
  const { label, cls } = map[status];
  return <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function NominationPanel({
  tournament, rankings, onNominate, user, actionLoading,
}: {
  tournament: SlotWorldCup;
  rankings: SlotWorldCupNominationRanking[];
  onNominate: (slotName: string) => Promise<void>;
  user: { id: string; kickVerified?: boolean } | null;
  actionLoading: boolean;
}) {
  const [slotName, setSlotName] = useState("");
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-bold text-white">Most Requested Slots</h3>
        <p className="text-xs text-white/40">Nominate in chat with <span className="text-yellow-400 font-mono">{tournament.nominationCommand} &lt;slot name&gt;</span></p>
      </div>

      {tournament.nominationsOpen && user && (
        <div className="flex gap-2 mb-5">
          <input
            value={slotName}
            onChange={(e) => setSlotName(e.target.value)}
            placeholder="Nominate a slot (e.g. Gates of Olympus)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400/40"
          />
          <button
            onClick={async () => { if (slotName.trim()) { await onNominate(slotName.trim()); setSlotName(""); } }}
            disabled={actionLoading || !slotName.trim()}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm transition-colors"
          >
            Nominate
          </button>
        </div>
      )}
      {tournament.nominationsOpen && user && !user.kickVerified && (
        <p className="text-xs text-yellow-300/70 mb-4">Verify your Kick account on the site to nominate from the web (or use !wc in chat).</p>
      )}

      {rankings.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-6">No nominations yet — be the first!</p>
      ) : (
        <div className="space-y-1.5">
          {rankings.slice(0, 20).map((r) => (
            <div key={r.rank} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${r.rank <= tournament.size ? "bg-yellow-400/8 border border-yellow-400/15" : "bg-white/3"}`}>
              <span className={`text-sm font-bold w-6 text-center ${r.rank <= tournament.size ? "text-yellow-400" : "text-white/30"}`}>{r.rank}</span>
              <span className="flex-1 text-sm text-white truncate">{r.slotName}</span>
              <span className="text-xs text-white/40">{r.votes} vote{r.votes === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-white/25 mt-4">Top {tournament.size} nominations qualify once nominations close.</p>
    </div>
  );
}

function LeaderboardTable({ leaderboard }: { leaderboard: SlotWorldCupLeaderboardEntry[] }) {
  if (leaderboard.length === 0) return <p className="text-white/30 text-sm text-center py-6">No predictions submitted yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/8">
            <th className="text-left py-2 px-2">Rank</th>
            <th className="text-left py-2 px-2">Player</th>
            <th className="text-right py-2 px-2">Score</th>
            <th className="text-right py-2 px-2">Correct</th>
            <th className="text-right py-2 px-2">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((e) => (
            <tr key={e.userId} className="border-b border-white/5">
              <td className="py-2 px-2 font-bold text-yellow-400">{e.rank}</td>
              <td className="py-2 px-2 text-white">{e.displayName}</td>
              <td className="py-2 px-2 text-right text-white font-semibold">{e.score}</td>
              <td className="py-2 px-2 text-right text-white/60">{e.correctPicks}</td>
              <td className="py-2 px-2 text-right text-white/60">{Math.round(e.accuracy * 1000) / 10}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SlotWorldCupPage() {
  const [user, setUser] = useState<{ id: string; kickVerified?: boolean } | null>(null);
  const [tournament, setTournament] = useState<SlotWorldCup | null>(null);
  const [rankings, setRankings] = useState<SlotWorldCupNominationRanking[]>([]);
  const [leaderboard, setLeaderboard] = useState<SlotWorldCupLeaderboardEntry[]>([]);
  const [myPrediction, setMyPrediction] = useState<SlotWorldCupPrediction | null>(null);
  const [localPicks, setLocalPicks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    authFetch(API_ENDPOINTS.AUTH_ME)
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.user) setUser(d.user); }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const all = await slotWorldCupApi.getAll();
      const active = all.find((t) => t.status !== SlotWorldCupStatus.CANCELLED) ?? null;
      setTournament(active);
      if (active) {
        if (active.status === SlotWorldCupStatus.NOMINATION) {
          setRankings(await slotWorldCupApi.getNominations(active.id));
        }
        if ([SlotWorldCupStatus.BRACKET_SET, SlotWorldCupStatus.IN_PROGRESS, SlotWorldCupStatus.COMPLETED, SlotWorldCupStatus.PREDICTIONS_OPEN].includes(active.status)) {
          setLeaderboard(await slotWorldCupApi.getLeaderboard(active.id));
        }
      }
    } catch { setError("Failed to load Slot World Cup"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!tournament || !user) return;
    slotWorldCupApi.getMyPrediction(tournament.id).then((p) => { if (p) { setMyPrediction(p); setLocalPicks(p.picks); } }).catch(() => {});
  }, [tournament?.id, user?.id]);

  useEffect(() => {
    if (!tournament) return;
    const socket = getSocket();
    socket.emit("joinSlotWorldCup", tournament.id);
    const onUpdate = (updated: SlotWorldCup) => { if (updated.id === tournament.id) { setTournament(updated); load(); } };
    socket.on("slotWorldCup:updated", onUpdate);
    socket.on("slotWorldCup:nominationsUpdated", () => { slotWorldCupApi.getNominations(tournament.id).then(setRankings).catch(() => {}); });
    socket.on("slotWorldCup:completed", () => load());
    return () => {
      socket.emit("leaveSlotWorldCup", tournament.id);
      socket.off("slotWorldCup:updated", onUpdate);
      socket.off("slotWorldCup:nominationsUpdated");
      socket.off("slotWorldCup:completed");
    };
  }, [tournament?.id, load]);

  const handleNominate = async (slotName: string) => {
    if (!tournament) return;
    setActionLoading(true); setError(null);
    try { setRankings(await slotWorldCupApi.nominate(tournament.id, slotName)); }
    catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handlePick = (key: string, slotId: string) => {
    // Changing an earlier-round pick invalidates anything downstream of it —
    // clear picks for all later rounds so the user re-confirms that chain.
    const [round] = key.split(":").map(Number);
    setLocalPicks((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const r = Number(k.split(":")[0]);
        if (r <= round && k !== key) next[k] = v;
      }
      next[key] = slotId;
      return next;
    });
  };

  const allPicked = useMemo(() => {
    if (!tournament) return false;
    return tournament.matches.every((m) => !!localPicks[`${m.round}:${m.matchNumber}`]);
  }, [tournament, localPicks]);

  const handleSubmitPrediction = async () => {
    if (!tournament) return;
    setActionLoading(true); setError(null);
    try { setMyPrediction(await slotWorldCupApi.submitPrediction(tournament.id, localPicks)); }
    catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  const canPredict = tournament?.status === SlotWorldCupStatus.PREDICTIONS_OPEN && !myPrediction;

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-20">
        <div className="mb-8">
          <Link href="/stream-games" className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm">
            <ArrowLeft className="w-4 h-4" /> Stream Games
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 leading-none">
            <span className="text-white">SLOT WORLD </span>
            <span style={{
              background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 40%, #d97706 70%, #fbbf24 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "0 0 40px rgba(245,158,11,0.3)",
            }}>CUP</span>
          </h1>
          <p className="text-white/45 text-base sm:text-lg max-w-lg mx-auto">
            Community-nominated slots battle it out in a single-elimination bracket. Predict every round to climb the leaderboard.
          </p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>}

        {!tournament ? (
          <div className="bg-white/3 border border-white/8 rounded-2xl px-8 py-14 text-center">
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mb-3">No Active Slot World Cup</p>
            <p className="text-white/50 text-base">Check back soon — the next bracket will appear here.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{tournament.title}</h2>
                <StatusBadge status={tournament.status} />
              </div>
              <span className="text-sm text-white/40">{tournament.size} slots</span>
            </div>

            {tournament.status === SlotWorldCupStatus.NOMINATION && (
              <NominationPanel tournament={tournament} rankings={rankings} onNominate={handleNominate} user={user} actionLoading={actionLoading} />
            )}

            {[SlotWorldCupStatus.BRACKET_SET, SlotWorldCupStatus.PREDICTIONS_OPEN, SlotWorldCupStatus.IN_PROGRESS, SlotWorldCupStatus.COMPLETED].includes(tournament.status) && (
              <div className="bg-white/3 border border-yellow-400/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <h3 className="text-lg font-bold text-white">Bracket</h3>
                  {canPredict && (
                    <button
                      onClick={handleSubmitPrediction}
                      disabled={!allPicked || actionLoading}
                      className="px-5 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm transition-colors"
                    >
                      {actionLoading ? "Submitting…" : allPicked ? "Submit Prediction" : "Complete Every Pick"}
                    </button>
                  )}
                  {myPrediction && tournament.status === SlotWorldCupStatus.PREDICTIONS_OPEN && (
                    <span className="text-xs text-green-400 font-semibold">✓ Prediction locked in</span>
                  )}
                </div>
                <SlotWorldCupBracket
                  tournament={tournament}
                  mode={tournament.status === SlotWorldCupStatus.PREDICTIONS_OPEN || tournament.status === SlotWorldCupStatus.BRACKET_SET ? "predict" : "view"}
                  picks={localPicks}
                  onPick={canPredict ? handlePick : undefined}
                  userPrediction={myPrediction?.picks}
                />
              </div>
            )}

            {[SlotWorldCupStatus.BRACKET_SET, SlotWorldCupStatus.PREDICTIONS_OPEN, SlotWorldCupStatus.IN_PROGRESS, SlotWorldCupStatus.COMPLETED].includes(tournament.status) && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Leaderboard</h3>
                <LeaderboardTable leaderboard={leaderboard} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
