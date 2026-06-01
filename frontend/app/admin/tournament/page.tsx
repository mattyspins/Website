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
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[4, 8, 16, 32].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setForm({ ...form, maxPlayers: n })}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                form.maxPlayers === n
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="block text-sm text-white/60 mb-1">Slot Timer</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
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
  onDraw: (count: number) => void;
}) {
  const [count, setCount] = useState(tournament.maxPlayers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (count < 2 || count > tournament.entryCount) {
      setError(`Need at least 2 entries. Currently ${tournament.entryCount} entered.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onDraw(count);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-navy-900 border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">Draw Tournament Spots</h3>
        <p className="text-sm text-white/50 mb-4">{tournament.entryCount} entries in the draw</p>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <label className="block text-sm text-white/60 mb-1">Number of spots to draw</label>
        <input
          type="number"
          min={2}
          max={Math.min(tournament.maxPlayers, tournament.entryCount)}
          value={count}
          onChange={(e) => setCount(+e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-6 focus:outline-none focus:border-yellow-400/50"
        />

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors"
          >
            🎲 Draw
          </button>
          <button onClick={onClose} className="px-4 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors">
            Cancel
          </button>
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
  const handleDraw = (count: number) => {
    setShowDraw(false);
    withAction(() => tournamentApi.drawWinners(selected!.id, count));
  };
  const handleStart = () => withAction(() => tournamentApi.startTournament(selected!.id));
  const handleCancel = () => {
    if (!confirm("Cancel this tournament?")) return;
    withAction(() => tournamentApi.cancel(selected!.id));
  };
  const handleReroll = (participantId: string) =>
    withAction(() => tournamentApi.rerollParticipant(selected!.id, participantId));
  const handleDeclareWinner = (matchId: string, winnerId: string) => {
    setWinnerMatchId(null);
    withAction(() => tournamentApi.declareMatchWinner(matchId, winnerId));
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
      <div className="max-w-7xl mx-auto px-4 py-10">
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

        {/* Tournament selector */}
        {tournaments.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  selected?.id === t.id
                    ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border-white/10"
                }`}
              >
                {t.title}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  t.status === TournamentStatus.IN_PROGRESS ? "bg-green-500/20 text-green-400" :
                  t.status === TournamentStatus.REGISTRATION ? "bg-blue-500/20 text-blue-400" :
                  t.status === TournamentStatus.COMPLETED ? "bg-white/10 text-white/30" :
                  "bg-white/5 text-white/30"
                }`}>
                  {t.status.replace("_", " ")}
                </span>
              </button>
            ))}
          </div>
        )}

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
                <div className="flex gap-2 flex-wrap">
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
                      disabled={actionLoading || selected.entryCount < 2}
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

            {/* Match management (IN_PROGRESS) */}
            {selected.status === TournamentStatus.IN_PROGRESS && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">Active Matches</h3>
                <div className="space-y-3">
                  {selected.matches
                    .filter((m) => m.status !== MatchStatus.PENDING && m.status !== MatchStatus.COMPLETED)
                    .map((match) => {
                      const p1 = match.participants[0];
                      const p2 = match.participants[1];
                      const getParticipant = (id: string) => selected.participants.find((p) => p.id === id);
                      const player1 = p1 ? getParticipant(p1.participantId) : null;
                      const player2 = p2 ? getParticipant(p2.participantId) : null;

                      return (
                        <div key={match.id} className="p-4 bg-white/5 rounded-lg border border-white/5">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <p className="text-xs text-white/40 mb-1">Round {match.round} · Match {match.matchNumber}</p>
                              <div className="flex items-center gap-3 text-sm">
                                <span className={`font-medium ${!p1 ? "text-white/30" : "text-white"}`}>
                                  {player1?.displayName ?? "TBD"}
                                  {p1?.slotCall && <span className="text-white/40 text-xs ml-1">({p1.slotCall})</span>}
                                  {p1?.slotConfirmed && <span className="text-green-400 ml-1 text-xs">✓</span>}
                                </span>
                                <span className="text-white/20">vs</span>
                                <span className={`font-medium ${!p2 ? "text-white/30" : "text-white"}`}>
                                  {player2?.displayName ?? "TBD"}
                                  {p2?.slotCall && <span className="text-white/40 text-xs ml-1">({p2.slotCall})</span>}
                                  {p2?.slotConfirmed && <span className="text-green-400 ml-1 text-xs">✓</span>}
                                </span>
                              </div>
                              <span className={`text-xs mt-1 inline-block ${
                                match.status === MatchStatus.ACTIVE ? "text-green-400" : "text-yellow-400"
                              }`}>
                                {match.status === MatchStatus.ACTIVE ? "Active — declare winner" : "Waiting for slot confirmations"}
                              </span>
                            </div>

                            {match.status === MatchStatus.ACTIVE && p1 && p2 && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDeclareWinner(match.id, p1.participantId)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/30 disabled:opacity-40 text-xs font-medium transition-colors"
                                >
                                  🏆 {player1?.displayName} wins
                                </button>
                                <button
                                  onClick={() => handleDeclareWinner(match.id, p2.participantId)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/30 disabled:opacity-40 text-xs font-medium transition-colors"
                                >
                                  🏆 {player2?.displayName} wins
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Bracket view */}
            {(selected.status === TournamentStatus.IN_PROGRESS ||
              selected.status === TournamentStatus.COMPLETED) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-base font-semibold text-white mb-6">Bracket</h3>
                <TournamentBracket tournament={selected} />
              </div>
            )}

            {/* Completed summary */}
            {selected.status === TournamentStatus.COMPLETED && (
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-yellow-300 font-bold text-lg">Tournament Complete!</p>
                {selected.participants.find((p) => p.finalPosition === 1) && (
                  <p className="text-white/60 text-sm mt-1">
                    Winner: <span className="text-white font-medium">{selected.participants.find((p) => p.finalPosition === 1)?.displayName}</span>
                  </p>
                )}
              </div>
            )}
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
