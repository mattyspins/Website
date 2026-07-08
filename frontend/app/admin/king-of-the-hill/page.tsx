"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { kothApi, KothSession, KothEntry, KothRound, KothUser } from "@/lib/api/kingOfTheHill";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";
import { useConfirm } from "@/components/admin/useConfirm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function name(u: KothUser | null | undefined) {
  if (!u) return "?";
  return u.kickUsername ?? u.displayName;
}

function fmtMulti(m: string | null) {
  if (m === null) return "—";
  return `${Number(m).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function Avatar({ u, size = 8 }: { u: KothUser | null | undefined; size?: number }) {
  const n = name(u);
  if (u?.avatarUrl) {
    return <img src={u.avatarUrl} alt="" className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold shrink-0`}
      style={{ fontSize: size * 2 }}>
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function CrownReveal({ entry, round, onClose }: { entry: KothEntry; round: KothRound; onClose: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${show ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex flex-col items-center gap-4 bg-gradient-to-b from-yellow-900/60 to-[#0a0a0a] border border-yellow-400/40 rounded-3xl px-14 py-12 shadow-2xl shadow-yellow-900/40 transition-all duration-500 ${show ? "scale-100 translate-y-0" : "scale-90 translate-y-8"}`}>
        <div className="text-6xl animate-bounce drop-shadow-[0_0_24px_rgba(250,204,21,0.6)]">👑</div>
        <p className="text-yellow-400/70 text-xs font-black uppercase tracking-[0.3em]">New King</p>
        <div className="p-1 rounded-full bg-gradient-to-br from-yellow-400 via-amber-300 to-yellow-400 shadow-[0_0_32px_rgba(250,204,21,0.5)]">
          <Avatar u={entry.user} size={24} />
        </div>
        <p className="text-white font-black text-3xl tracking-tight text-center">{name(entry.user)}</p>
        <p className="text-yellow-300 font-black text-2xl">{fmtMulti(round.multiplier)}</p>
        {round.slotName && <p className="text-white/40 text-sm">{round.slotName}</p>}
        <button
          onClick={onClose}
          className="mt-2 px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors text-sm"
        >
          Long Live the King 👑
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminKingOfTheHillPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<KothSession | null>(null);
  const [history, setHistory] = useState<KothSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crownReveal, setCrownReveal] = useState<{ entry: KothEntry; round: KothRound } | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

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
      const [active, all] = await Promise.all([kothApi.getActive(), kothApi.getAll()]);
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
    const joinRoom = () => { if (session) socket.emit("joinKoth", session.id); };
    if (session) { joinRoom(); socket.on("connect", joinRoom); }

    const handle = (updated: KothSession) => {
      if (updated.status === "OPEN") {
        setSession(updated);
      } else if (session?.id === updated.id) {
        setSession(null);
        setHistory((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      }
    };
    socket.on("koth:updated", handle);

    return () => {
      if (session) { socket.emit("leaveKoth", session.id); socket.off("connect", joinRoom); }
      socket.off("koth:updated", handle);
    };
  }, [session?.id]);

  const withAction = async (fn: () => Promise<KothSession>) => {
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
    await withAction(() => kothApi.create(label.trim() || undefined));
    setLabel("");
  };

  const handleClose = () => session && withAction(() => kothApi.close(session.id));

  const handleDraw = () => session && withAction(() => kothApi.draw(session.id));

  const handleCancelDraw = () => session && withAction(() => kothApi.cancelDraw(session.id));

  const handleAddEntry = async () => {
    if (!session || !manualUsername.trim()) return;
    const updated = await withAction(() => kothApi.addEntry(session.id, manualUsername.trim()));
    if (updated) setManualUsername("");
  };

  const handleRemoveEntry = (entryId: string) => withAction(() => kothApi.removeEntry(entryId));

  const handleSubmitRound = async () => {
    if (!drawnEntry) return;
    const bet = parseFloat(betAmount);
    const payout = parseFloat(payoutAmount);
    if (!(bet > 0) || isNaN(payout) || payout < 0) { setError("Enter a valid bet and payout"); return; }

    const prevKingEntryId = session?.entries.find((e) => e.status === "KING")?.id ?? null;
    const updated = await withAction(() => kothApi.submitRound(drawnEntry.id, bet, payout));
    setBetAmount(""); setPayoutAmount("");

    if (updated) {
      const newKingEntry = updated.entries.find((e) => e.status === "KING");
      if (newKingEntry && newKingEntry.userId === drawnEntry.userId && newKingEntry.id !== prevKingEntryId) {
        const round = updated.rounds.find((r) => r.entryId === newKingEntry.id && r.isKing);
        if (round) setCrownReveal({ entry: newKingEntry, round });
      }
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!(await confirm({ title: "Delete this session?", message: "This permanently removes the session and its history. This cannot be undone." }))) return;
    setActionLoading(true);
    try {
      await kothApi.delete(id);
      setHistory((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const entries = session?.entries ?? [];
  const waiting = entries.filter((e) => e.status === "WAITING");
  const kingEntry = entries.find((e) => e.status === "KING") ?? null;
  const kingRound = session?.rounds.find((r) => r.isKing) ?? null;
  const drawnEntry = entries.find((e) => e.status === "DRAWN") ?? null;
  const drawnRound = drawnEntry
    ? session?.rounds.find((r) => r.entryId === drawnEntry.id && !r.playedAt) ?? null
    : null;
  const climbs = (session?.rounds ?? [])
    .filter((r) => r.playedAt)
    .sort((a, b) => Number(b.multiplier) - Number(a.multiplier));

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
              <h1 className="text-2xl font-bold text-white">King of the Hill</h1>
              <p className="text-white/40 text-sm mt-0.5">Viewers type !king to join — draw a challenger, record their slot result, crown the king</p>
            </div>
            <a
              href="/king-of-the-hill-widget"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 text-yellow-300 text-xs font-semibold rounded-lg transition-colors shrink-0"
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
            <h2 className="text-base font-semibold text-white mb-4">Open a New Session</h2>
            <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Friday Night KOTH"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-yellow-400/50 text-sm"
            />
            <button
              onClick={handleCreate}
              disabled={actionLoading}
              className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition-colors"
            >
              👑 Open Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: King + Draw ── */}
            <div className="space-y-4">

              {/* Session header */}
              <div className="bg-white/5 border border-yellow-400/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-white font-bold">{session.label || "King of the Hill — Live"}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={actionLoading}
                    className="px-3 py-1.5 border border-white/15 text-white/40 text-xs rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    Close Session
                  </button>
                </div>
                <p className="text-white/40 text-xs mt-1">
                  Type <code className="bg-white/10 text-yellow-300 px-1.5 py-0.5 rounded font-mono">!king</code> in Kick chat to join · {entries.length} {entries.length === 1 ? "viewer" : "viewers"}
                </p>
              </div>

              {/* Current King */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Current King</h2>
                {kingEntry && kingRound ? (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-400/10 to-transparent border border-yellow-400/25 rounded-xl">
                    <span className="text-3xl">👑</span>
                    <Avatar u={kingEntry.user} size={12} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate">{name(kingEntry.user)}</p>
                      {kingRound.slotName && <p className="text-white/40 text-xs truncate">{kingRound.slotName}</p>}
                    </div>
                    <p className="text-yellow-300 font-black text-xl shrink-0">{fmtMulti(kingRound.multiplier)}</p>
                  </div>
                ) : (
                  <p className="text-white/25 text-sm text-center py-4">No king yet — draw a challenger to claim the hill</p>
                )}
              </div>

              {/* Draw panel */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Draw a Challenger</h2>

                {!drawnEntry ? (
                  <button
                    onClick={handleDraw}
                    disabled={actionLoading || waiting.length === 0}
                    className="w-full py-4 rounded-xl font-black text-lg tracking-wide bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-900/30 active:scale-95 disabled:opacity-40 transition-all"
                  >
                    🎯 Draw Random Viewer
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                      <Avatar u={drawnEntry.user} size={9} />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold truncate">{name(drawnEntry.user)}</p>
                        <p className="text-white/30 text-xs">is up next</p>
                      </div>
                    </div>

                    {!drawnRound?.slotName ? (
                      <p className="text-center text-white/40 text-sm py-3">
                        Waiting for <code className="bg-white/10 text-yellow-300 px-1.5 py-0.5 rounded font-mono">!slot &lt;name&gt;</code> in chat…
                      </p>
                    ) : (
                      <>
                        <p className="text-center text-white/70 text-sm">
                          Called: <span className="text-yellow-300 font-semibold">{drawnRound.slotName}</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Bet</label>
                            <input
                              type="number" step="0.01" min="0"
                              value={betAmount}
                              onChange={(e) => setBetAmount(e.target.value)}
                              placeholder="0.20"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Payout</label>
                            <input
                              type="number" step="0.01" min="0"
                              value={payoutAmount}
                              onChange={(e) => setPayoutAmount(e.target.value)}
                              placeholder="20.00"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/40"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleSubmitRound}
                          disabled={actionLoading || !betAmount || !payoutAmount}
                          className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition-colors"
                        >
                          Submit Result
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleCancelDraw}
                      disabled={actionLoading}
                      className="w-full py-2 border border-white/10 text-white/40 rounded-xl hover:bg-white/5 text-xs transition-colors"
                    >
                      Cancel Draw
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Pool + Hill history ── */}
            <div className="space-y-4">

              {/* Waiting pool */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Waiting Pool ({waiting.length})</h2>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1 mb-3">
                  {waiting.length === 0 ? (
                    <p className="text-white/25 text-sm text-center py-4">No one waiting</p>
                  ) : (
                    waiting.map((e) => (
                      <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                        <Avatar u={e.user} size={7} />
                        <span className="text-white/80 text-sm font-medium truncate">{name(e.user)}</span>
                        <button
                          onClick={() => handleRemoveEntry(e.id)}
                          disabled={actionLoading}
                          className="ml-auto text-white/20 hover:text-red-400 transition-colors text-xs shrink-0"
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
                      onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
                      placeholder="Kick username"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/40 font-mono"
                    />
                    <button
                      onClick={handleAddEntry}
                      disabled={actionLoading || !manualUsername.trim()}
                      className="px-3 py-1.5 bg-white/8 border border-white/10 text-white/60 text-xs rounded-lg hover:bg-white/12 disabled:opacity-30 transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Climbs / hill leaderboard */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Climbs ({climbs.length})</h2>
                {climbs.length === 0 ? (
                  <p className="text-white/25 text-sm text-center py-4">No results yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {climbs.map((r, i) => (
                      <div key={r.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${r.isKing ? "bg-yellow-400/8 border-yellow-400/20" : "bg-white/3 border-white/5"}`}>
                        <span className="text-white/20 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                        <Avatar u={r.user} size={7} />
                        <div className="min-w-0 flex-1">
                          <p className="text-white/85 text-sm font-medium truncate">{name(r.user)}</p>
                          {r.slotName && <p className="text-white/30 text-[11px] truncate">{r.slotName}</p>}
                        </div>
                        <span className={`text-sm font-black shrink-0 ${r.isKing ? "text-yellow-300" : "text-white/50"}`}>
                          {r.isKing && "👑 "}{fmtMulti(r.multiplier)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Past Sessions ── */}
        {history.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4">Past Sessions</p>
            <div className="space-y-2">
              {history.map((s) => {
                const finalKingRound = s.rounds.find((r) => r.isKing);
                const finalKingEntry = finalKingRound ? s.entries.find((e) => e.id === finalKingRound.entryId) : null;
                return (
                  <div key={s.id} className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-xl px-5 py-4">
                    <span className="text-white/60 text-sm font-semibold shrink-0">{s.label || "King of the Hill"}</span>
                    <div className="text-white/15 text-sm shrink-0">·</div>
                    <span className="text-white/40 text-sm shrink-0">{s.entries.length} entries</span>
                    <div className="text-white/15 text-sm shrink-0">·</div>
                    {finalKingEntry && finalKingRound ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-yellow-400 text-sm shrink-0">👑</span>
                        <Avatar u={finalKingEntry.user} size={6} />
                        <span className="text-white font-semibold text-sm truncate">{name(finalKingEntry.user)}</span>
                        <span className="text-yellow-300 text-xs font-bold shrink-0">{fmtMulti(finalKingRound.multiplier)}</span>
                      </div>
                    ) : (
                      <span className="text-white/25 text-sm flex-1">No king crowned</span>
                    )}
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
                );
              })}
            </div>
          </div>
        )}
      </div>

      {crownReveal && (
        <CrownReveal
          entry={crownReveal.entry}
          round={crownReveal.round}
          onClose={() => setCrownReveal(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
}
