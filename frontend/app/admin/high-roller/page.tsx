"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  highRollerApi,
  HighRollerSession,
  HighRollerPlayer,
  HighRollerHallOfFame,
} from "@/lib/api/highRoller";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";
import { useConfirm } from "@/components/admin/useConfirm";
import Confetti from "@/components/highRoller/Confetti";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function name(p: HighRollerPlayer | null | undefined) {
  if (!p) return "?";
  return p.user.kickUsername ?? p.user.displayName;
}

function fmtMulti(v: string | number | null) {
  if (v === null) return "—";
  return `${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function Avatar({ p, size = 8 }: { p: HighRollerPlayer | null | undefined; size?: number }) {
  const n = name(p);
  if (p?.user.avatarUrl) {
    return <img src={p.user.avatarUrl} alt="" className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold shrink-0`}
      style={{ fontSize: size * 2 }}>
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function HallOfFamePanel({ summary, onClose }: { summary: HighRollerHallOfFame; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {summary.champions.length > 0 && <Confetti />}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gradient-to-b from-red-950/60 to-[#0a0a0a] border border-red-500/30 rounded-3xl px-8 py-8 shadow-2xl">
        <p className="text-red-400/70 text-xs font-black uppercase tracking-[0.3em] text-center mb-2">Hall of Fame</p>
        <h2 className="text-2xl font-black text-white text-center mb-6">Game Over</h2>

        {summary.champions.length > 0 && (
          <div className="text-center mb-6">
            <p className="text-4xl mb-1">👑</p>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Champion{summary.champions.length > 1 ? "s" : ""}</p>
            <p className="text-gold-300 font-black text-xl">{summary.champions.map((c) => c.kickUsername).join(" & ")}</p>
            <p className="text-white/40 text-sm">Longest Streak: {summary.longestStreak}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/40 text-xs uppercase tracking-wide">Most Accurate</p>
            <p className="text-white font-semibold truncate">
              {summary.mostAccurate.length > 0 ? `${summary.mostAccurate[0].kickUsername} (${summary.mostAccurate[0].accuracy}%)` : "—"}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/40 text-xs uppercase tracking-wide">Most Correct</p>
            <p className="text-white font-semibold truncate">
              {summary.mostCorrectPredictions.length > 0 ? `${summary.mostCorrectPredictions[0].kickUsername} (${summary.mostCorrectPredictions[0].correctCount})` : "—"}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/40 text-xs uppercase tracking-wide">Rounds Played</p>
            <p className="text-white font-semibold">{summary.totalRoundsPlayed}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/40 text-xs uppercase tracking-wide">Biggest Comeback</p>
            <p className="text-white font-semibold truncate">
              {summary.biggestComeback ? `${summary.biggestComeback.kickUsername} (${summary.biggestComeback.streak})` : "—"}
            </p>
          </div>
        </div>

        {summary.mvp && (
          <p className="text-center text-white/40 text-xs mt-5">⭐ MVP: <span className="text-white font-semibold">{summary.mvp.kickUsername}</span></p>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-colors text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminHighRollerPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<HighRollerSession | null>(null);
  const [history, setHistory] = useState<HighRollerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Create-game form
  const [title, setTitle] = useState("");
  const [threshold, setThreshold] = useState("100");
  const [treatMissedAsWrong, setTreatMissedAsWrong] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [joinKeyword, setJoinKeyword] = useState("!join");
  const [leaveKeyword, setLeaveKeyword] = useState("!leave");
  const [overKeyword, setOverKeyword] = useState("!over");
  const [underKeyword, setUnderKeyword] = useState("!under");
  const [suggestKeyword, setSuggestKeyword] = useState("!suggest");

  const [manualUsername, setManualUsername] = useState("");
  const [slotResult, setSlotResult] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [drawPool, setDrawPool] = useState<"joined" | "suggested">("joined");
  const [excludePrevious, setExcludePrevious] = useState(true);
  const [lastSuggestionWinner, setLastSuggestionWinner] = useState<string | null>(null);
  const [hallOfFame, setHallOfFame] = useState<HighRollerHallOfFame | null>(null);
  const [drawing, setDrawing] = useState<{ current: string; settled: boolean } | null>(null);

  // Auth check
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
      const [active, all] = await Promise.all([highRollerApi.getActive(), highRollerApi.getAll()]);
      setSession(active);
      setHistory(all.filter((s) => s.status === "CLOSED"));
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Socket live updates
  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => { if (session) socket.emit("joinHighRoller", session.id); };
    if (session) { joinRoom(); socket.on("connect", joinRoom); }

    const handle = (updated: HighRollerSession) => {
      if (updated.status === "OPEN") {
        setSession(updated);
      } else if (session?.id === updated.id) {
        setSession(null);
        setHistory((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      }
    };
    socket.on("highroller:updated", handle);

    return () => {
      if (session) { socket.emit("leaveHighRoller", session.id); socket.off("connect", joinRoom); }
      socket.off("highroller:updated", handle);
    };
  }, [session?.id]);

  const withAction = async (fn: () => Promise<HighRollerSession>) => {
    setActionLoading(true); setError(null);
    try {
      const updated = await fn();
      if (updated.status === "OPEN") {
        setSession(updated);
      } else {
        setSession(null);
        setHistory((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      }
      return updated;
    } catch (e: any) { setError(e.message); return null; }
    finally { setActionLoading(false); }
  };

  const handleCreate = async () => {
    const t = parseFloat(threshold);
    if (!(t > 0)) { setError("Enter a valid threshold"); return; }
    const updated = await withAction(() =>
      highRollerApi.create({
        title: title.trim() || undefined,
        threshold: t,
        treatMissedAsWrong,
        joinKeyword: joinKeyword.trim() || undefined,
        leaveKeyword: leaveKeyword.trim() || undefined,
        overKeyword: overKeyword.trim() || undefined,
        underKeyword: underKeyword.trim() || undefined,
        suggestKeyword: suggestKeyword.trim() || undefined,
      })
    );
    if (updated) { setTitle(""); setHallOfFame(null); }
  };

  const handleAddPlayer = async () => {
    if (!session || !manualUsername.trim()) return;
    const updated = await withAction(() => highRollerApi.addPlayer(session.id, manualUsername.trim()));
    if (updated) setManualUsername("");
  };

  const handleRemovePlayer = (playerId: string) => withAction(() => highRollerApi.removePlayer(playerId));

  const handlePauseToggle = () => session && withAction(() => (session.paused ? highRollerApi.resume(session.id) : highRollerApi.pause(session.id)));

  const handleFinalRoundToggle = () => session && withAction(() => highRollerApi.setFinalRound(session.id, !session.finalRound));

  const handleLock = () => session && withAction(() => highRollerApi.lockPredictions(session.id));

  const handleResetRound = () => session && withAction(() => highRollerApi.resetRound(session.id));

  const handleChangeThreshold = async () => {
    if (!session || !newThreshold) return;
    const t = parseFloat(newThreshold);
    if (!(t > 0)) { setError("Enter a valid threshold"); return; }
    const updated = await withAction(() => highRollerApi.changeThreshold(session.id, t));
    if (updated) setNewThreshold("");
  };

  const handleResolve = async () => {
    if (!session) return;
    const result = parseFloat(slotResult);
    if (!(result >= 0)) { setError("Enter a valid slot result"); return; }
    setActionLoading(true); setError(null);
    try {
      const { session: updated } = await highRollerApi.resolveRound(session.id, result);
      setSession(updated);
      setSlotResult("");
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleDrawSuggestion = async () => {
    if (!session) return;
    setActionLoading(true); setError(null);

    // Rapidly cycle through eligible names (slowing down) while the draw resolves,
    // instead of instantly revealing the winner — same suspense beat viewers get.
    const candidates = drawPool === "joined" ? session.players.filter((p) => p.active).map((p) => name(p)) : [];
    setDrawing({ current: candidates[0] ?? "…", settled: false });

    const cycle = new Promise<void>((resolve) => {
      if (candidates.length === 0) { resolve(); return; }
      let i = 0;
      let delay = 70;
      let elapsed = 0;
      const step = () => {
        i = (i + 1) % candidates.length;
        setDrawing({ current: candidates[i], settled: false });
        elapsed += delay;
        delay = Math.min(delay * 1.15, 200);
        if (elapsed < 1400) setTimeout(step, delay);
        else resolve();
      };
      setTimeout(step, delay);
    });

    try {
      const [{ session: updated, winner }] = await Promise.all([
        highRollerApi.drawSuggestion(session.id, drawPool, excludePrevious),
        cycle,
      ]);
      setSession(updated);
      setDrawing({ current: winner.kickUsername, settled: true });
      setLastSuggestionWinner(winner.kickUsername);
      setTimeout(() => setDrawing(null), 2200);
    } catch (e: any) {
      setError(e.message);
      setDrawing(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndGame = async () => {
    if (!session) return;
    if (!(await confirm({ title: "End this game?", message: "This closes the game and shows the Hall of Fame summary. This cannot be undone.", confirmText: "End Game" }))) return;
    setActionLoading(true); setError(null);
    try {
      const { session: updated, hallOfFame: hof } = await highRollerApi.endGame(session.id);
      setSession(null);
      setHistory((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      setHallOfFame(hof);
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteSession = async (id: string) => {
    if (!(await confirm({ title: "Delete this session?", message: "This permanently removes the session and its history. This cannot be undone." }))) return;
    setActionLoading(true);
    try {
      await highRollerApi.delete(id);
      setHistory((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400" />
      </div>
    );
  }

  const players = session?.players ?? [];
  const activePlayers = players.filter((p) => p.active);
  const predictedCount = activePlayers.filter((p) => p.currentPrediction !== null).length;
  const overCount = activePlayers.filter((p) => p.currentPrediction === "OVER").length;
  const underCount = activePlayers.filter((p) => p.currentPrediction === "UNDER").length;
  const rounds = [...(session?.rounds ?? [])].sort((a, b) => b.roundNumber - a.roundNumber);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 pb-16">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm mb-4 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">High Roller</h1>
              <p className="text-white/40 text-sm mt-0.5">Viewers predict Over/Under a multiplier line and build a streak — no elimination, just bragging rights.</p>
            </div>
            <a
              href="/high-roller-widget"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              OBS Widget
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {!session ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md">
            <h2 className="text-base font-semibold text-white mb-4">Start a New Game</h2>
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday Night High Roller"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-red-400/50 text-sm"
            />
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Threshold (multiplier)</label>
            <div className="flex gap-2 mb-1">
              <input
                type="number" step="1" min="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-400/50 text-sm"
              />
              <span className="flex items-center px-3 text-white/40 text-sm">x</span>
            </div>
            <div className="flex gap-1.5 mb-4">
              {[50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setThreshold(String(v))}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 text-xs transition-colors"
                >
                  {v}x
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
              <input type="checkbox" checked={treatMissedAsWrong} onChange={(e) => setTreatMissedAsWrong(e.target.checked)} className="accent-red-500" />
              <span className="text-sm text-white/60">Missed predictions count as wrong (reset streak)</span>
            </label>

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs text-white/40 hover:text-white/70 mb-3 transition-colors"
            >
              {showAdvanced ? "− Hide" : "+ Customize"} chat commands
            </button>
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  ["Join", joinKeyword, setJoinKeyword],
                  ["Leave", leaveKeyword, setLeaveKeyword],
                  ["Over", overKeyword, setOverKeyword],
                  ["Under", underKeyword, setUnderKeyword],
                  ["Suggest (optional)", suggestKeyword, setSuggestKeyword],
                ].map(([label, value, setter]: any) => (
                  <div key={label}>
                    <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-widest">{label}</label>
                    <input
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-red-400/40"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={actionLoading}
              className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 disabled:opacity-40 transition-colors"
            >
              🎲 Start Game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Round controls ── */}
            <div className="space-y-4">

              {/* Session header */}
              <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${session.paused ? "bg-yellow-400" : "bg-green-400 animate-pulse"}`} />
                    <p className="text-white font-bold">{session.title || "High Roller — Live"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePauseToggle}
                      disabled={actionLoading}
                      className="px-3 py-1.5 border border-white/15 text-white/40 text-xs rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                    >
                      {session.paused ? "Resume" : "Pause"}
                    </button>
                    <button
                      onClick={handleEndGame}
                      disabled={actionLoading}
                      className="px-3 py-1.5 border border-red-500/30 text-red-300 text-xs rounded-lg hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                    >
                      End Game
                    </button>
                  </div>
                </div>
                <p className="text-white/40 text-xs mt-1">
                  Round {session.roundNumber + 1} · Type <code className="bg-white/10 text-red-300 px-1.5 py-0.5 rounded font-mono">{session.joinKeyword}</code> to join · {players.length} {players.length === 1 ? "player" : "players"}
                </p>
                <button
                  onClick={handleFinalRoundToggle}
                  disabled={actionLoading}
                  className={`mt-2 text-xs px-2 py-1 rounded-md transition-colors ${session.finalRound ? "bg-red-500/20 text-red-300 border border-red-500/40" : "text-white/30 hover:text-white/60"}`}
                >
                  {session.finalRound ? "⚠️ Marked as Final Round" : "Mark as Final Round"}
                </button>
              </div>

              {/* Threshold */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-3">Current Line</h2>
                <p className="text-gold-300 font-black text-3xl mb-4">{fmtMulti(session.threshold)}</p>
                {!session.roundLocked && (
                  <div className="flex gap-2">
                    <input
                      type="number" step="1" min="1"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      placeholder="New threshold"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/40"
                    />
                    <button
                      onClick={handleChangeThreshold}
                      disabled={actionLoading || !newThreshold}
                      className="px-3 py-2 bg-white/8 border border-white/10 text-white/60 text-xs rounded-lg hover:bg-white/12 disabled:opacity-30 transition-colors shrink-0"
                    >
                      Update
                    </button>
                  </div>
                )}
              </div>

              {/* Round controls */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Round Controls</h2>

                {!session.roundLocked ? (
                  <>
                    <p className="text-white/50 text-sm mb-4">
                      {predictedCount} of {activePlayers.length} predicted — <span className="text-red-300">{overCount} Over</span> / <span className="text-white/70">{underCount} Under</span>
                    </p>
                    <button
                      onClick={handleLock}
                      disabled={actionLoading || activePlayers.length === 0}
                      className="w-full py-4 rounded-xl font-black text-lg tracking-wide bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-900/30 active:scale-95 disabled:opacity-40 transition-all"
                    >
                      🔒 Lock Predictions
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-white/50 text-sm">
                      Predictions locked — {overCount} Over / {underCount} Under
                    </p>
                    <div>
                      <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Slot Result (multiplier)</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={slotResult}
                        onChange={(e) => setSlotResult(e.target.value)}
                        placeholder="127.52"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-400/40"
                      />
                    </div>
                    <button
                      onClick={handleResolve}
                      disabled={actionLoading || !slotResult}
                      className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 disabled:opacity-40 transition-colors"
                    >
                      Resolve Round
                    </button>
                    <button
                      onClick={handleResetRound}
                      disabled={actionLoading}
                      className="w-full py-2 border border-white/10 text-white/40 rounded-xl hover:bg-white/5 text-xs transition-colors"
                    >
                      Reset Round (undo lock)
                    </button>
                  </div>
                )}
              </div>

              {/* Suggestion draw */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Slot Suggestion Draw</h2>
                <div className="flex gap-2 mb-3">
                  <select
                    value={drawPool}
                    onChange={(e) => setDrawPool(e.target.value as "joined" | "suggested")}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/40"
                  >
                    <option value="joined">Joined players</option>
                    <option value="suggested">{session.suggestKeyword ?? "!suggest"} entrants</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                  <input type="checkbox" checked={excludePrevious} onChange={(e) => setExcludePrevious(e.target.checked)} className="accent-red-500" />
                  <span className="text-xs text-white/50">Exclude previous winners until everyone's had a turn</span>
                </label>
                <button
                  onClick={handleDrawSuggestion}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-white/8 border border-white/10 text-white/70 rounded-xl hover:bg-white/12 disabled:opacity-30 transition-colors text-sm font-semibold"
                >
                  🎲 Draw Slot Suggestion
                </button>
                {lastSuggestionWinner && (
                  <p className="text-center text-red-300 text-sm mt-3">🎉 {lastSuggestionWinner} picks the next slot!</p>
                )}
              </div>
            </div>

            {/* ── Right: Players + leaderboard ── */}
            <div className="space-y-4">

              {/* Players */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Players ({players.length})</h2>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1 mb-3">
                  {players.length === 0 ? (
                    <p className="text-white/25 text-sm text-center py-4">No one has joined yet</p>
                  ) : (
                    players.map((p) => (
                      <div key={p.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${p.active ? "bg-white/3 border-white/5" : "bg-white/2 border-white/5 opacity-40"}`}>
                        <Avatar p={p} size={7} />
                        <span className="text-white/80 text-sm font-medium truncate">{name(p)}</span>
                        {p.currentPrediction && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${p.currentPrediction === "OVER" ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/60"}`}>
                            {p.currentPrediction}
                          </span>
                        )}
                        <span className="text-gold-300 text-xs font-bold shrink-0 ml-auto">🔥{p.currentStreak}</span>
                        <button
                          onClick={() => handleRemovePlayer(p.id)}
                          disabled={actionLoading}
                          className="text-white/20 hover:text-red-400 transition-colors text-xs shrink-0"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-3 border-t border-white/8">
                  <p className="text-white/30 text-xs mb-2">Add viewer manually</p>
                  <div className="flex gap-2">
                    <input
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                      placeholder="Kick username"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-400/40 font-mono"
                    />
                    <button
                      onClick={handleAddPlayer}
                      disabled={actionLoading || !manualUsername.trim()}
                      className="px-3 py-1.5 bg-white/8 border border-white/10 text-white/60 text-xs rounded-lg hover:bg-white/12 disabled:opacity-30 transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Leaderboard</h2>
                {players.length === 0 ? (
                  <p className="text-white/25 text-sm text-center py-4">No players yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {players.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                        <span className="text-white/20 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                        <Avatar p={p} size={7} />
                        <div className="min-w-0 flex-1">
                          <p className="text-white/85 text-sm font-medium truncate">{name(p)}</p>
                          <p className="text-white/30 text-[11px]">{p.roundsPlayed} rounds · {p.accuracy}% acc</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-gold-300 text-sm font-black">🔥{p.currentStreak}</p>
                          <p className="text-white/25 text-[10px]">best {p.bestStreak}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Round history */}
              {rounds.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-base font-semibold text-white mb-4">Round History ({rounds.length})</h2>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {rounds.map((r) => (
                      <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/3 border border-white/5 text-sm">
                        <span className="text-white/30 text-xs w-8 shrink-0">#{r.roundNumber}</span>
                        <span className="text-white/50 text-xs shrink-0">Line {fmtMulti(r.threshold)}</span>
                        <span className="text-white font-semibold shrink-0">{fmtMulti(r.slotResult)}</span>
                        <span className={`text-xs font-bold shrink-0 ${r.winningSide === "OVER" ? "text-red-300" : "text-white/60"}`}>{r.winningSide}</span>
                        <span className="text-white/25 text-[11px] ml-auto shrink-0">{r.numberOver}O / {r.numberUnder}U</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Past Sessions ── */}
        {history.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4">Past Games</p>
            <div className="space-y-2">
              {history.map((s) => (
                <div key={s.id} className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-xl px-5 py-4">
                  <span className="text-white/60 text-sm font-semibold shrink-0">{s.title || "High Roller"}</span>
                  <div className="text-white/15 text-sm shrink-0">·</div>
                  <span className="text-white/40 text-sm shrink-0">{s.players.length} players</span>
                  <div className="text-white/15 text-sm shrink-0">·</div>
                  <span className="text-white/40 text-sm shrink-0">{s.rounds.length} rounds</span>
                  <span className="text-white/20 text-xs shrink-0 ml-auto">
                    {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    disabled={actionLoading}
                    className="ml-2 text-white/20 hover:text-red-400 transition-colors text-sm shrink-0"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hallOfFame && <HallOfFamePanel summary={hallOfFame} onClose={() => setHallOfFame(null)} />}
      {drawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="text-center">
            <p className="text-white/40 text-sm font-bold uppercase tracking-[0.3em] mb-4">
              {drawing.settled ? "🎉 Slot Suggestion Winner" : "Choosing…"}
            </p>
            <p className={`font-black text-4xl sm:text-5xl transition-colors ${drawing.settled ? "text-gold-400" : "text-white"}`}>
              {drawing.current}
            </p>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
