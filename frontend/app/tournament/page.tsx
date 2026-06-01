"use client";

import { useEffect, useState, useCallback } from "react";
import { tournamentApi } from "@/lib/api/tournament";
import TournamentBracket from "@/components/TournamentBracket";
import {
  Tournament,
  TournamentStatus,
  MatchStatus,
  TournamentMatch,
  MyEntryResponse,
} from "@/types/tournament";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";

// ─── Slot Modal ────────────────────────────────────────────────────────────────
function SlotModal({
  title,
  currentSlot,
  deadline,
  onSubmit,
  onConfirm,
  onClose,
  canConfirm,
  isLoading,
}: {
  title: string;
  currentSlot: string | null;
  deadline: string | null;
  onSubmit: (slot: string) => void;
  onConfirm?: () => void;
  onClose: () => void;
  canConfirm: boolean;
  isLoading: boolean;
}) {
  const [slot, setSlot] = useState(currentSlot ?? "");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-navy-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        {timeLeft !== null && (
          <p className={`text-sm mb-4 ${timeLeft < 30 ? "text-red-400" : "text-white/50"}`}>
            Time remaining: {fmt(timeLeft)}
          </p>
        )}

        <label className="block text-sm text-white/60 mb-1">Your slot call</label>
        <input
          type="text"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          placeholder="e.g. Book of Dead x500"
          maxLength={100}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400/50 mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(slot.trim())}
            disabled={!slot.trim() || isLoading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving…" : "Save Slot"}
          </button>
          {canConfirm && onConfirm && (
            <button
              onClick={onConfirm}
              disabled={!slot.trim() || isLoading}
              className="flex-1 bg-green-500 text-white font-semibold py-2.5 rounded-lg hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Confirm & Lock
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TournamentStatus }) {
  const map: Record<TournamentStatus, { label: string; cls: string }> = {
    [TournamentStatus.DRAFT]: { label: "Draft", cls: "bg-white/10 text-white/40" },
    [TournamentStatus.REGISTRATION]: { label: "Open for Entry", cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse" },
    [TournamentStatus.SLOT_SELECTION]: { label: "Slot Selection", cls: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" },
    [TournamentStatus.IN_PROGRESS]: { label: "In Progress", cls: "bg-green-500/20 text-green-300 border border-green-500/30" },
    [TournamentStatus.COMPLETED]: { label: "Completed", cls: "bg-white/10 text-white/50" },
    [TournamentStatus.CANCELLED]: { label: "Cancelled", cls: "bg-red-500/20 text-red-400" },
  };
  const { label, cls } = map[status];
  return <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${cls}`}>{label}</span>;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TournamentPage() {
  const [user, setUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [myEntry, setMyEntry] = useState<MyEntryResponse | null>(null);
  const [activeMatch, setActiveMatch] = useState<TournamentMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      const data = await tournamentApi.getAll();
      setTournaments(data);
      // Auto-select most recent active one
      const active = data.find(
        (t) =>
          t.status === TournamentStatus.IN_PROGRESS ||
          t.status === TournamentStatus.REGISTRATION ||
          t.status === TournamentStatus.SLOT_SELECTION
      );
      if (active && !selected) setSelected(active);
    } catch {
      setError("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyEntry = useCallback(async (tournamentId: string) => {
    if (!user) return;
    try {
      const data = await tournamentApi.getMyEntry(tournamentId);
      setMyEntry(data);
    } catch {
      setMyEntry(null);
    }
  }, [user]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (selected) loadMyEntry(selected.id);
  }, [selected?.id, loadMyEntry]);

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

  const handleEnter = async () => {
    if (!selected || !user) return;
    setActionLoading(true);
    setError(null);
    try {
      await tournamentApi.enter(selected.id);
      await loadMyEntry(selected.id);
      const updated = await tournamentApi.getById(selected.id);
      setSelected(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!selected || !user) return;
    setActionLoading(true);
    setError(null);
    try {
      await tournamentApi.leave(selected.id);
      await loadMyEntry(selected.id);
      const updated = await tournamentApi.getById(selected.id);
      setSelected(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetInitialSlot = async (slotCall: string) => {
    if (!selected) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await tournamentApi.setInitialSlot(selected.id, slotCall);
      setSelected(updated);
      await loadMyEntry(selected.id);
      setActiveMatch(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetMatchSlot = async (slotCall: string) => {
    if (!activeMatch) return;
    setActionLoading(true);
    setError(null);
    try {
      await tournamentApi.setMatchSlot(activeMatch.id, slotCall);
      const updated = await tournamentApi.getById(selected!.id);
      setSelected(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMatchSlot = async () => {
    if (!activeMatch) return;
    setActionLoading(true);
    setError(null);
    try {
      await tournamentApi.confirmMatchSlot(activeMatch.id);
      const updated = await tournamentApi.getById(selected!.id);
      setSelected(updated);
      setActiveMatch(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine if current user needs to set initial slot
  const needsInitialSlot =
    selected?.status === TournamentStatus.SLOT_SELECTION &&
    myEntry?.isParticipant &&
    myEntry.participant &&
    !myEntry.participant.slotConfirmed;

  // Find participant's active match slot state
  const myParticipant = myEntry?.participant;
  const myActiveMatchFull = selected?.matches.find(
    (m) =>
      m.status === MatchStatus.SLOT_SELECTION &&
      m.participants.some((mp) => mp.participantId === myParticipant?.id)
  );
  const myMatchParticipation = myActiveMatchFull?.participants.find(
    (mp) => mp.participantId === myParticipant?.id
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Tournament</h1>
            <p className="text-white/50">Single elimination bracket — enter the draw and compete for glory</p>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors"
          >
            <span>📋</span> Rules
          </button>
        </div>

        {/* Rules modal */}
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRules(false)} />
            <div className="relative w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏆</span>
                  <h2 className="text-base font-bold text-white">How it works</h2>
                </div>
                <button onClick={() => setShowRules(false)} className="text-white/30 hover:text-white transition-colors text-lg leading-none">✕</button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-white/70 leading-relaxed">
                <p className="text-white/90">Compete against other viewers in a single-elimination bracket. The highest multiplier each round advances until one player is crowned <span className="text-yellow-400 font-semibold">Tournament Champion 👑</span>.</p>

                <div>
                  <p className="text-white font-bold mb-3 text-xs uppercase tracking-widest">The Flow</p>
                  <ol className="space-y-2.5">
                    {[
                      "Admin opens registration — click Enter Draw to join",
                      "Admin draws the participants from everyone who entered",
                      "Each selected participant names their slot call within the timer",
                      "Participants are randomly shuffled into the bracket",
                      "Each round, Matty plays everyone's slots live on stream",
                      "The highest multiplier advances to the next round",
                      "Every round is do-or-die — one huge hit can change everything 🔥",
                      "Last player standing is crowned Tournament Champion 🏆",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-yellow-400 font-bold shrink-0 w-4">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                  <p className="text-white font-bold mb-2.5 text-xs uppercase tracking-widest">🎁 Rewards can include</p>
                  <div className="flex flex-wrap gap-2">
                    {["Website points", "Giveaway entries", "Community rewards", "Special event prizes"].map((r) => (
                      <span key={r} className="bg-white/5 border border-white/10 text-white/60 text-xs px-3 py-1 rounded-lg">{r}</span>
                    ))}
                  </div>
                </div>

                <p className="text-white/40 text-xs border-t border-white/5 pt-4">Make sure you&apos;re in stream from the start to secure your place 👊</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tournament tabs */}
        {tournaments.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selected?.id === t.id
                    ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {tournaments.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-lg">No tournaments yet</p>
            <p className="text-sm mt-1">Check back when a tournament is announced!</p>
          </div>
        )}

        {selected && (
          <>
            {/* Tournament header card */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="flex gap-4 text-sm text-white/50">
                    <span>{selected.maxPlayers} players</span>
                    <span>·</span>
                    <span>{selected.entryCount} entered</span>
                    <span>·</span>
                    <span>Slot timer: {Math.floor(selected.slotTimerSeconds / 60)}:{String(selected.slotTimerSeconds % 60).padStart(2, "0")}</span>
                  </div>
                </div>

                {/* Action button */}
                {user && selected.status === TournamentStatus.REGISTRATION && (
                  <div>
                    {myEntry?.entered ? (
                      <button
                        onClick={handleLeave}
                        disabled={actionLoading}
                        className="px-5 py-2.5 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 transition-colors text-sm font-medium"
                      >
                        Leave Draw
                      </button>
                    ) : (
                      <button
                        onClick={handleEnter}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors text-sm"
                      >
                        {actionLoading ? "Entering…" : "Enter Draw"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Participant list during slot selection */}
              {selected.status === TournamentStatus.SLOT_SELECTION && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-white/50 mb-3">Selected participants — waiting for slot calls</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.participants.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
                          p.slotConfirmed
                            ? "bg-green-500/10 border-green-500/20 text-green-300"
                            : "bg-white/5 border-white/10 text-white/70"
                        }`}
                      >
                        {p.avatarUrl && <img src={p.avatarUrl} alt="" className="w-4 h-4 rounded-full" />}
                        <span>{p.displayName}</span>
                        {p.currentSlot && (
                          <span className="text-xs text-white/40">· {p.currentSlot}</span>
                        )}
                        {p.slotConfirmed ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <span className="text-yellow-400 text-xs animate-pulse">⏳</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alert: you need to set your slot */}
            {needsInitialSlot && (
              <div className="mb-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-yellow-300">You've been selected! 🎉</p>
                    <p className="text-sm text-white/60 mt-0.5">Name your slot call before the timer runs out.</p>
                  </div>
                  <button
                    onClick={() => setActiveMatch({ id: "initial", round: 0, matchNumber: 0, status: MatchStatus.SLOT_SELECTION, winnerId: null, nextMatchId: null, slotDeadline: myEntry?.participant?.slotDeadline ?? null, participants: [] })}
                    className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm shrink-0"
                  >
                    Set Slot
                  </button>
                </div>
              </div>
            )}

            {/* Alert: active match needs slot */}
            {myActiveMatchFull && myMatchParticipation && !myMatchParticipation.slotConfirmed && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-green-300">Your match is ready!</p>
                    <p className="text-sm text-white/60 mt-0.5">
                      {myMatchParticipation.slotCall
                        ? `Current slot: ${myMatchParticipation.slotCall} — you can change it or confirm.`
                        : "Set your slot call for this round."}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveMatch(myActiveMatchFull)}
                    className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 transition-colors text-sm shrink-0"
                  >
                    {myMatchParticipation.slotCall ? "Update / Confirm" : "Set Slot"}
                  </button>
                </div>
              </div>
            )}

            {/* Bracket */}
            {(selected.status === TournamentStatus.IN_PROGRESS ||
              selected.status === TournamentStatus.COMPLETED) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-base font-semibold text-white mb-6">Bracket</h3>
                <TournamentBracket
                  tournament={selected}
                  myParticipantId={myParticipant?.id}
                  onMatchClick={setActiveMatch}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Initial slot modal */}
      {activeMatch?.id === "initial" && (
        <SlotModal
          title="Name Your Slot"
          currentSlot={myEntry?.participant?.currentSlot ?? null}
          deadline={myEntry?.participant?.slotDeadline ?? null}
          onSubmit={handleSetInitialSlot}
          onClose={() => setActiveMatch(null)}
          canConfirm={false}
          isLoading={actionLoading}
        />
      )}

      {/* Match slot modal */}
      {activeMatch && activeMatch.id !== "initial" && (
        <SlotModal
          title={`Round ${activeMatch.round} — Set Slot`}
          currentSlot={myMatchParticipation?.slotCall ?? null}
          deadline={activeMatch.slotDeadline}
          onSubmit={handleSetMatchSlot}
          onConfirm={handleConfirmMatchSlot}
          onClose={() => setActiveMatch(null)}
          canConfirm={!!myMatchParticipation?.slotCall && !myMatchParticipation?.slotConfirmed}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}
