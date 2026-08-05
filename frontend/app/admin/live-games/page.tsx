"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { liftApi, LiftSession } from "@/lib/api/lift";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";
import { useConfirm } from "@/components/admin/useConfirm";

const STATUS_LABEL: Record<string, string> = {
  JOIN: "Accepting !join",
  READY: "Ready check",
  ROUND_LOBBY: "Round starting",
  ROUND_DECISION: "Doors open — picking lifts",
  ROUND_LOCK: "Doors locking",
  ROUND_PAUSE: "Processing",
  ROUND_RESOLVE: "Resolving",
  FINALE: "Finale",
  ENDED: "Ended",
  CANCELLED: "Cancelled",
};

export default function AdminLiveGamesPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<LiftSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!d.user?.isAdmin) router.push("/"); else setAuthLoading(false); })
      .catch(() => router.push("/"));
  }, []);

  const load = useCallback(async () => {
    try {
      setSession(await liftApi.getActive());
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => { if (session) socket.emit("joinLift", session.id); };
    if (session) { joinRoom(); socket.on("connect", joinRoom); }

    const handle = (updated: LiftSession) => {
      if (["ENDED", "CANCELLED"].includes(updated.status)) {
        if (session?.id === updated.id) setSession(null);
      } else {
        setSession(updated);
      }
    };
    socket.on("lift:updated", handle);

    return () => {
      if (session) { socket.emit("leaveLift", session.id); socket.off("connect", joinRoom); }
      socket.off("lift:updated", handle);
    };
  }, [session?.id]);

  const withAction = async (fn: () => Promise<LiftSession>) => {
    setActionLoading(true); setError(null);
    try {
      const updated = await fn();
      setSession(["ENDED", "CANCELLED"].includes(updated.status) ? null : updated);
      return updated;
    } catch (e: any) { setError(e.message); return null; }
    finally { setActionLoading(false); }
  };

  const handleCreate = async () => {
    await withAction(() => liftApi.create(label.trim() || undefined));
    setLabel("");
  };

  const handleAdvanceToReady = () => session && withAction(() => liftApi.advanceToReady(session.id));
  const handleStart = () => session && withAction(() => liftApi.start(session.id));

  const handleCancel = async () => {
    if (!session) return;
    if (!(await confirm({ title: "Cancel this Lift session?", message: "This ends the game immediately for everyone watching." }))) return;
    await withAction(() => liftApi.cancel(session.id));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const players = session?.players ?? [];
  const readyCount = players.filter((p) => p.ready).length;
  const aliveCount = players.filter((p) => p.alive).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 pb-16">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm mb-4 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Live Games — Lift</h1>
              <p className="text-white/50 text-sm mt-0.5">
                Chat-driven survival game: viewers !join, !ready, then pick elevators each round. Display it full-screen while it runs.
              </p>
            </div>
            <a
              href="/live-games"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 text-yellow-300 text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Live Display
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {!session ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md">
            <h2 className="text-base font-semibold text-white mb-4">Start a New Session</h2>
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Friday Night Lift"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-yellow-400/50 text-sm"
            />
            <button
              onClick={handleCreate}
              disabled={actionLoading}
              className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition-colors"
            >
              🛗 Open Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Status header */}
            <div className="bg-white/5 border border-yellow-400/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-white font-bold">{session.label || "Lift — Live"}</p>
                </div>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 border border-white/15 text-white/50 text-xs rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                >
                  Cancel Session
                </button>
              </div>
              <p className="text-white/50 text-xs mt-1">
                {STATUS_LABEL[session.status] ?? session.status}
                {session.round > 0 && ` · Round ${session.round}${session.roundType ? ` (${session.roundType})` : ""}`}
                {" · "}{aliveCount} alive
              </p>
            </div>

            {/* Phase controls */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Phase Control</h2>

              {session.status === "JOIN" && (
                <div className="space-y-3">
                  <p className="text-white/70 text-sm">
                    Viewers type <code className="bg-white/10 text-yellow-300 px-1.5 py-0.5 rounded font-mono">{session.joinKeyword}</code> in Kick chat to join.
                  </p>
                  <p className="text-white/50 text-xs">{players.length} joined so far</p>
                  <button
                    onClick={handleAdvanceToReady}
                    disabled={actionLoading || players.length === 0}
                    className="w-full py-4 rounded-xl font-black text-lg tracking-wide bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-900/30 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    Close Joins → Start Ready Check
                  </button>
                </div>
              )}

              {session.status === "READY" && (
                <div className="space-y-3">
                  <p className="text-white/70 text-sm">
                    Viewers type <code className="bg-white/10 text-yellow-300 px-1.5 py-0.5 rounded font-mono">{session.readyKeyword}</code> to confirm they're still here.
                  </p>
                  <p className="text-white/50 text-xs">{readyCount} / {players.length} ready</p>
                  <button
                    onClick={handleStart}
                    disabled={actionLoading || readyCount === 0}
                    className="w-full py-4 rounded-xl font-black text-lg tracking-wide bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-900/30 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    Start Game
                  </button>
                </div>
              )}

              {!["JOIN", "READY"].includes(session.status) && (
                <p className="text-white/50 text-sm">
                  Game is running autonomously — phases advance on their own. Watch it live on the display page, or cancel above if something goes wrong.
                </p>
              )}
            </div>

            {/* Players */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Players ({players.length})</h2>
              {players.length === 0 ? (
                <p className="text-white/45 text-sm text-center py-4">No one has joined yet</p>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div key={p.kickUsername} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${p.alive ? "bg-white/3 border-white/5" : "bg-red-500/5 border-red-500/10"}`}>
                      <span className={`text-sm font-medium truncate ${p.alive ? "text-white/80" : "text-white/35 line-through"}`}>{p.kickUsername}</span>
                      <div className="ml-auto flex items-center gap-2 shrink-0 text-xs">
                        {session.status === "READY" && (
                          <span className={p.ready ? "text-[#4fd18b]" : "text-white/40"}>{p.ready ? "✓ ready" : "waiting"}</span>
                        )}
                        {p.currentElevator && <span className="text-yellow-300">Lift {p.currentElevator}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
