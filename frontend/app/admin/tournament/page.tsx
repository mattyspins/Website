"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tournamentApi } from "@/lib/api/tournament";
import TournamentBracket from "@/components/TournamentBracket";
import {
  Tournament,
  TournamentStatus,
  TournamentMatch,
  MatchStatus,
} from "@/types/tournament";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Tournament) => void }) {
  const [form, setForm] = useState({ title: "", maxPlayers: 8, slotTimerSeconds: 180 });
  const [customMins, setCustomMins] = useState("");
  const [customPlayers, setCustomPlayers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    setLoading(true);
    setError(null);
    try {
      const t = await tournamentApi.create(form);
      onCreate(t);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-navy-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Create Tournament</h3>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <label className="block text-sm text-white/60 mb-1">Title</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-yellow-400/50"
          placeholder="e.g. Sunday Showdown"
        />

        <label className="block text-sm text-white/60 mb-1">Max Players</label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[4, 8, 16, 32].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setForm({ ...form, maxPlayers: n }); setCustomPlayers(""); }}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                form.maxPlayers === n && !customPlayers
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-white/40 shrink-0">Custom (e.g. 9, 10, 11, 12):</span>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => {
                const next = Math.max(2, (parseInt(customPlayers) || form.maxPlayers) - 1);
                setCustomPlayers(String(next));
                setForm({ ...form, maxPlayers: next });
              }}
              className="w-7 h-7 rounded bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors flex items-center justify-center text-base leading-none"
            >−</button>
            <input
              type="text" inputMode="numeric" placeholder="players"
              value={customPlayers}
              onChange={(e) => {
                setCustomPlayers(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n) && n >= 2) setForm({ ...form, maxPlayers: n });
              }}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
            />
            <button type="button"
              onClick={() => {
                const next = Math.min(64, (parseInt(customPlayers) || form.maxPlayers) + 1);
                setCustomPlayers(String(next));
                setForm({ ...form, maxPlayers: next });
              }}
              className="w-7 h-7 rounded bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors flex items-center justify-center text-base leading-none"
            >+</button>
          </div>
        </div>

        <label className="block text-sm text-white/60 mb-1">Slot Timer</label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[{ label: "2 min", value: 120 }, { label: "3 min", value: 180 }, { label: "4 min", value: 240 }, { label: "5 min", value: 300 }].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, slotTimerSeconds: value })}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                form.slotTimerSeconds === value
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-white/40 shrink-0">Custom:</span>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => {
                const cur = parseFloat(customMins) || 0;
                const next = Math.max(0.5, parseFloat((cur - 0.5).toFixed(1)));
                setCustomMins(String(next));
                setForm({ ...form, slotTimerSeconds: Math.round(next * 60) });
              }}
              className="w-7 h-7 rounded bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors flex items-center justify-center text-base leading-none"
            >−</button>
            <input
              type="text"
              inputMode="decimal"
              placeholder="min"
              value={customMins}
              onChange={(e) => {
                setCustomMins(e.target.value);
                const mins = parseFloat(e.target.value);
                if (!isNaN(mins) && mins > 0) setForm({ ...form, slotTimerSeconds: Math.round(mins * 60) });
              }}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-yellow-400/50"
            />
            <button type="button"
              onClick={() => {
                const cur = parseFloat(customMins) || 0;
                const next = parseFloat((cur + 0.5).toFixed(1));
                setCustomMins(String(next));
                setForm({ ...form, slotTimerSeconds: Math.round(next * 60) });
              }}
              className="w-7 h-7 rounded bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors flex items-center justify-center text-base leading-none"
            >+</button>
            <span className="text-xs text-white/40 ml-1">min</span>
            {![120, 180, 240, 300].includes(form.slotTimerSeconds) && customMins && (
              <span className="text-xs text-yellow-400 font-medium ml-1">
                = {Math.floor(form.slotTimerSeconds / 60)}m {form.slotTimerSeconds % 60 > 0 ? `${form.slotTimerSeconds % 60}s` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors"
          >
            {loading ? "Creating…" : "Create"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Draw Modal ───────────────────────────────────────────────────────────────
function DrawModal({
  tournament,
  onClose,
  onDraw,
}: {
  tournament: Tournament;
  onClose: () => void;
  onDraw: (count: number, guaranteedUserIds: string[]) => void;
}) {
  const [entries, setEntries] = useState<{ id: string; userId: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [guaranteed, setGuaranteed] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(Math.min(tournament.maxPlayers, Math.max(tournament.entryCount, 1)));
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(() => {
    tournamentApi.getEntries(tournament.id)
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setEntriesError(false); })
      .catch(() => setEntriesError(true))
      .finally(() => setLoadingEntries(false));
  }, [tournament.id]);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  const toggleGuaranteed = (userId: string) => {
    setGuaranteed((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const guaranteedCount = guaranteed.size;
  const randomSpotsLeft = Math.max(0, count - guaranteedCount);

  const submit = () => {
    if (count < 1) { setError("Must draw at least 1 participant."); return; }
    if (count > tournament.entryCount) { setError(`Only ${tournament.entryCount} entries in the draw.`); return; }
    if (guaranteedCount > count) { setError("More guaranteed picks than total spots."); return; }
    onDraw(count, Array.from(guaranteed));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-navy-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/8">
          <h3 className="text-lg font-semibold text-white mb-0.5">Draw Tournament Spots</h3>
          <p className="text-sm text-white/40">{entries.length || tournament.entryCount} people entered</p>
        </div>

        {/* Total spots */}
        <div className="px-6 py-4 border-b border-white/8">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-white/60">Total spots to fill</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setCount(Math.max(1, count - 1))} className="w-7 h-7 rounded bg-white/5 text-white/60 hover:bg-white/10 text-sm transition-colors">−</button>
              <span className="text-white font-bold w-6 text-center">{count}</span>
              <button onClick={() => setCount(Math.min(tournament.entryCount, count + 1))} className="w-7 h-7 rounded bg-white/5 text-white/60 hover:bg-white/10 text-sm transition-colors">+</button>
            </div>
          </div>
          {guaranteedCount > 0 && (
            <div className="mt-2 flex gap-4 text-xs text-white/40">
              <span>✓ <span className="text-yellow-400 font-semibold">{guaranteedCount}</span> guaranteed</span>
              <span>🎲 <span className="text-white/70 font-semibold">{randomSpotsLeft}</span> random</span>
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="overflow-y-auto flex-1 px-6 py-3">
          <p className="text-xs text-white/35 uppercase tracking-widest font-bold mb-3">
            Tick to guarantee entry — rest are random
          </p>

          {loadingEntries ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400" />
            </div>
          ) : entriesError ? (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm mb-2">Failed to load entries</p>
              <button onClick={fetchEntries} className="text-xs text-yellow-400 hover:text-yellow-300 underline">Retry</button>
            </div>
          ) : entries.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No entries yet</p>
          ) : (
            <div className="space-y-1.5">
              {entries.map((e) => {
                const isGuaranteed = guaranteed.has(e.userId);
                return (
                  <div
                    key={e.userId}
                    onClick={() => toggleGuaranteed(e.userId)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      isGuaranteed
                        ? "bg-yellow-400/15 border border-yellow-400/30"
                        : "bg-white/3 border border-white/5 hover:bg-white/6"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isGuaranteed ? "bg-yellow-400 border-yellow-400" : "border-white/20 bg-white/5"
                    }`}>
                      {isGuaranteed && <span className="text-black text-[10px] font-black">✓</span>}
                    </div>

                    {/* Avatar */}
                    {e.avatarUrl ? (
                      <img src={e.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-white/50">
                        {e.displayName[0]?.toUpperCase()}
                      </div>
                    )}

                    <span className={`text-sm font-medium ${isGuaranteed ? "text-yellow-300" : "text-white/80"}`}>
                      {e.displayName}
                    </span>

                    {isGuaranteed && (
                      <span className="ml-auto text-[10px] text-yellow-400 font-bold uppercase tracking-wide">Guaranteed</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8">
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 transition-colors">
              🎲 Draw {count} Participant{count !== 1 ? "s" : ""}
            </button>
            <button onClick={onClose} className="px-4 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminTournamentPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDraw, setShowDraw] = useState(false);
  const [winnerMatchId, setWinnerMatchId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user?.isAdmin) router.push("/");
        else setAuthLoading(false);
      })
      .catch(() => router.push("/"));
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      const data = await tournamentApi.getAll();
      setTournaments(data);
      if (!selected && data.length > 0) setSelected(data[0]);
    } catch {
      setError("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  // WebSocket
  useEffect(() => {
    if (!selected) return;
    const socket = getSocket();
    socket.emit("joinTournament", selected.id);
    socket.on("tournament:updated", (updated: Tournament) => {
      if (updated.id === selected.id) {
        setSelected(updated);
        setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    });
    return () => {
      socket.emit("leaveTournament", selected.id);
      socket.off("tournament:updated");
    };
  }, [selected?.id]);

  const withAction = async (fn: () => Promise<Tournament>) => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await fn();
      setSelected(updated);
      setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRegistration = () => withAction(() => tournamentApi.openRegistration(selected!.id));
  const handleDraw = (count: number, guaranteedUserIds: string[]) => {
    setShowDraw(false);
    withAction(() => tournamentApi.drawWinners(selected!.id, count, guaranteedUserIds));
  };
  const handleStart = () => withAction(() => tournamentApi.startTournament(selected!.id));
  const handleCancel = () => {
    if (!confirm("Cancel this tournament?")) return;
    withAction(() => tournamentApi.cancel(selected!.id));
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    setActionLoading(true);
    setError(null);
    try {
      await tournamentApi.deleteTournament(id);
      const remaining = tournaments.filter((t) => t.id !== id);
      setTournaments(remaining);
      setSelected(remaining[0] ?? null);
    } catch (e: any) {
      setError(e?.message ?? e?.error ?? "Failed to delete tournament");
    } finally {
      setActionLoading(false);
    }
  };
  const handleReroll = (participantId: string) =>
    withAction(() => tournamentApi.rerollParticipant(selected!.id, participantId));
  const handleDeclareWinner = (matchId: string, winnerId: string) => {
    setWinnerMatchId(null);
    withAction(() => tournamentApi.declareMatchWinner(matchId, winnerId));
  };

  const handleRevertWinner = (matchId: string) => {
    if (!confirm("Revert this result? The match will go back to Active and the loser will be restored.")) return;
    withAction(() => tournamentApi.revertMatchWinner(matchId));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const activeMatch = winnerMatchId ? selected?.matches.find((m) => m.id === winnerMatchId) : null;

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Tournament Admin</h1>
            <p className="text-white/40 text-sm mt-0.5">Create and manage viewer tournaments</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm"
          >
            + New Tournament
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tournament list — vertical cards */}
        <div className="space-y-2 mb-6">
          {tournaments.map((t) => {
            const isActive = selected?.id === t.id;
            const statusColor =
              t.status === TournamentStatus.IN_PROGRESS ? "bg-green-500/20 text-green-400 border-green-500/30" :
              t.status === TournamentStatus.REGISTRATION ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
              t.status === TournamentStatus.SLOT_SELECTION ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/30" :
              t.status === TournamentStatus.COMPLETED ? "bg-white/5 text-white/30 border-white/10" :
              "bg-white/5 text-white/30 border-white/10";
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className={`cursor-pointer rounded-xl border transition-all duration-200 ${
                  isActive ? "border-yellow-400/40 bg-yellow-400/5" : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      t.status === TournamentStatus.IN_PROGRESS || t.status === TournamentStatus.REGISTRATION ? "bg-green-400 animate-pulse" :
                      t.status === TournamentStatus.SLOT_SELECTION ? "bg-yellow-400 animate-pulse" : "bg-white/20"
                    }`} />
                    <span className="font-semibold text-white text-sm">{t.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/35">
                    <span>{t.maxPlayers} spots</span>
                    <span>{t.entryCount} entered</span>
                    {isActive && <span className="text-yellow-400 text-sm">▾</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.title); }}
                      disabled={actionLoading}
                      className="ml-1 px-2 py-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-30 text-base"
                      title="Delete tournament"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="space-y-6">
            {/* Control panel */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                  <p className="text-sm text-white/40 mt-0.5">
                    {selected.maxPlayers} spots · {selected.entryCount} entries · Timer: {Math.floor(selected.slotTimerSeconds / 60)}m
                  </p>
                </div>

                {/* Status-based action buttons */}
                <div className="flex gap-2 flex-wrap items-center">
                  <a
                    href="/tournament-widget"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open OBS widget"
                    className="px-3 py-2 border border-purple-500/40 text-purple-300 rounded-lg hover:bg-purple-500/10 transition-colors text-sm flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                    OBS Widget
                  </a>
                  {selected.status === TournamentStatus.DRAFT && (
                    <button
                      onClick={handleOpenRegistration}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-400 disabled:opacity-40 transition-colors text-sm"
                    >
                      Open Registration
                    </button>
                  )}
                  {selected.status === TournamentStatus.REGISTRATION && (
                    <button
                      onClick={() => setShowDraw(true)}
                      disabled={actionLoading || selected.entryCount < 1}
                      className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors text-sm"
                    >
                      🎲 Draw Participants
                    </button>
                  )}
                  {selected.status === TournamentStatus.SLOT_SELECTION && (
                    <button
                      onClick={handleStart}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 disabled:opacity-40 transition-colors text-sm"
                    >
                      Force Start Bracket
                    </button>
                  )}
                  {![TournamentStatus.COMPLETED, TournamentStatus.CANCELLED].includes(selected.status) && (
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Slot selection participant list with reroll */}
              {selected.status === TournamentStatus.SLOT_SELECTION && selected.participants.length > 0 && (
                <div>
                  <p className="text-sm text-white/50 mb-3 font-medium">Participants — slot selection</p>
                  <div className="space-y-2">
                    {selected.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          {p.avatarUrl && <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full" />}
                          <div>
                            <p className="text-sm text-white font-medium">{p.displayName}</p>
                            <p className="text-xs text-white/40">
                              {p.currentSlot ? `Slot: ${p.currentSlot}` : "No slot yet"}
                              {p.slotDeadline && !p.slotConfirmed && ` · expires ${new Date(p.slotDeadline).toLocaleTimeString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.slotConfirmed ? (
                            <span className="text-xs text-green-400 font-medium">✓ Confirmed</span>
                          ) : (
                            <>
                              <span className="text-xs text-yellow-400 animate-pulse">⏳ Waiting</span>
                              <button
                                onClick={() => handleReroll(p.id)}
                                disabled={actionLoading}
                                className="text-xs px-3 py-1.5 border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/10 disabled:opacity-40 transition-colors"
                              >
                                Reroll
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bracket (admin — with inline winner + revert controls) */}
            {(selected.status === TournamentStatus.IN_PROGRESS ||
              selected.status === TournamentStatus.COMPLETED) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-base font-semibold text-white mb-6">Bracket</h3>
                <TournamentBracket
                  tournament={selected}
                  isAdmin
                  onDeclareWinner={handleDeclareWinner}
                  onRevertWinner={handleRevertWinner}
                  onRerollParticipant={handleReroll}
                  actionLoading={actionLoading}
                />
              </div>
            )}

            {/* Completed summary */}
            {selected.status === TournamentStatus.COMPLETED && (() => {
              const champ = selected.participants.find((p) => p.finalPosition === 1);
              return (
                <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-400/25 rounded-2xl p-8 text-center">
                  {/* Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none" />
                  <div className="text-6xl mb-3 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">🏆</div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400/70 mb-1">Tournament Complete</p>
                  {champ && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      {champ.avatarUrl && (
                        <img src={champ.avatarUrl} alt="" className="w-14 h-14 rounded-full ring-2 ring-yellow-400/60 shadow-[0_0_16px_rgba(250,204,21,0.3)]" />
                      )}
                      <p className="text-white font-bold text-xl">{champ.displayName}</p>
                      {champ.currentSlot && <p className="text-white/40 text-sm italic">{champ.currentSlot}</p>}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {tournaments.length === 0 && !loading && (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-lg">No tournaments yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm"
            >
              Create First Tournament
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(t) => {
            setTournaments((prev) => [t, ...prev]);
            setSelected(t);
            setShowCreate(false);
          }}
        />
      )}

      {showDraw && selected && (
        <DrawModal
          tournament={selected}
          onClose={() => setShowDraw(false)}
          onDraw={handleDraw}
        />
      )}
    </div>
  );
}
