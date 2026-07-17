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
import { authFetch } from "@/lib/authFetch";
import { isAuthenticated } from "@/lib/authPersistence";
import SlotPicker, { SlotImage, VolatilityBadge } from "@/components/SlotPicker";
import { findSlot } from "@/lib/slotGames";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// ─── Slot Modal ────────────────────────────────────────────────────────────────
function SlotModal({
  title, currentSlot, deadline, onSubmit, onConfirm, onClose, canConfirm, isLoading,
}: {
  title: string; currentSlot: string | null; deadline: string | null;
  onSubmit: (slot: string) => void; onConfirm?: () => void; onClose: () => void;
  canConfirm: boolean; isLoading: boolean;
}) {
  const [slot, setSlot] = useState(currentSlot ?? "");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const selectedGame = findSlot(slot);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setTimeLeft(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        {timeLeft !== null && (
          <p className={`text-sm mb-4 ${timeLeft < 30 ? "text-red-400" : "text-white/50"}`}>
            Time remaining: {fmt(timeLeft)}
          </p>
        )}
        <label className="block text-sm text-white/60 mb-1">Your slot call</label>
        <div className="mb-3">
          <SlotPicker value={slot} onChange={setSlot} disabled={isLoading} />
        </div>
        {selectedGame && (
          <div className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-lg bg-white/5 border border-white/8">
            <SlotImage src={selectedGame.image} name={selectedGame.name} size={52} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selectedGame.name}</p>
              <p className="text-xs text-white/40 truncate">{selectedGame.provider}</p>
            </div>
            <VolatilityBadge volatility={selectedGame.volatility} />
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => onSubmit(slot.trim())} disabled={!slot.trim() || isLoading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors">
            {isLoading ? "Saving…" : "Save Slot"}
          </button>
          {canConfirm && onConfirm && (
            <button onClick={onConfirm} disabled={!slot.trim() || isLoading}
              className="flex-1 bg-green-500 text-white font-semibold py-2.5 rounded-lg hover:bg-green-400 disabled:opacity-40 transition-colors">
              Confirm & Lock
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Timer Countdown ──────────────────────────────────────────────────────
function SlotTimerCountdown({ deadline }: { deadline: string | null }) {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (secs === null || !deadline) return null;
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const expired = secs === 0;

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono font-bold ${
      expired
        ? "bg-red-500/10 border-red-500/30 text-red-400"
        : secs < 30
        ? "bg-red-500/15 border-red-500/40 text-red-300 animate-pulse"
        : secs < 60
        ? "bg-orange-500/15 border-orange-500/30 text-orange-300"
        : "bg-yellow-400/10 border-yellow-400/20 text-yellow-300"
    }`}>
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      {expired ? "Slot timer expired" : `Slot selection: ${mins}:${String(s).padStart(2, "0")}`}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TournamentStatus }) {
  const map: Record<TournamentStatus, { label: string; cls: string }> = {
    [TournamentStatus.DRAFT]: { label: "Draft", cls: "bg-white/8 text-white/40" },
    [TournamentStatus.REGISTRATION]: { label: "Open for Entry", cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse" },
    [TournamentStatus.SLOT_SELECTION]: { label: "Slot Selection", cls: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" },
    [TournamentStatus.IN_PROGRESS]: { label: "Live", cls: "bg-green-500/20 text-green-300 border border-green-500/30" },
    [TournamentStatus.COMPLETED]: { label: "Completed", cls: "bg-white/8 text-white/40" },
    [TournamentStatus.CANCELLED]: { label: "Cancelled", cls: "bg-red-500/10 text-red-400" },
  };
  const { label, cls } = map[status];
  return <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

// ─── Rules Modal ────────────────────────────────────────────────────────────────
function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5"><span className="text-xl">🏆</span><h2 className="text-base font-bold text-white">Tournament Rules</h2></div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-white/70 leading-relaxed">
          <p className="text-white/90">Compete in a single-elimination bracket. The highest multiplier each round advances until one player is crowned <span className="text-yellow-400 font-semibold">Tournament Champion 👑</span>.</p>
          <div>
            <p className="text-white font-bold mb-3 text-xs uppercase tracking-widest">The Flow</p>
            <ol className="space-y-2.5">
              {["Admin opens registration — click Enter Draw to join", "Admin draws participants randomly from everyone who entered", "Each selected participant names their slot call within the timer — it's locked for the whole tournament", "Participants are randomly shuffled into the bracket", "Each round, Matty plays everyone's slots live on stream", "The highest multiplier advances to the next round", "Every round is do-or-die — one huge hit can change everything 🔥", "Last player standing is crowned Tournament Champion 🏆"].map((s, i) => (
                <li key={i} className="flex gap-3"><span className="text-yellow-400 font-bold shrink-0 w-4">{i + 1}.</span><span>{s}</span></li>
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
  );
}

// ─── Instructions Modal ─────────────────────────────────────────────────────────
function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5"><span className="text-xl">🎮</span><h2 className="text-base font-bold text-white">How to Play</h2></div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-white/70 leading-relaxed">
          {[
            { step: "Enter the Draw", body: <>When registration opens, click <span className="text-yellow-400 font-semibold">Enter Draw</span> to put your name in the raffle. The admin randomly selects participants.</> },
            { step: "Name Your Slot", body: <>If selected, you have a limited time to <span className="text-yellow-400 font-semibold">name a slot call</span> — the game Matty plays for you every round. No two players can share the same slot.</> },
            { step: "Watch the Bracket", body: <>Participants are <span className="text-yellow-400 font-semibold">randomly shuffled</span> into the bracket. Matty plays each slot live — highest multiplier in each match advances.</> },
            { step: "Locked In", body: <>Your slot is <span className="text-yellow-400 font-semibold">locked for the entire tournament</span> once confirmed. Pick wisely — it&apos;s your weapon every round until you&apos;re eliminated or crowned champion.</> },
            { step: "Win the Tournament", body: <>Keep advancing until only one player remains — they&apos;re crowned <span className="text-yellow-400 font-semibold">Tournament Champion 👑</span>.</> },
          ].map(({ step, body }, i) => (
            <div key={i}>
              <p className="text-white font-bold mb-2 text-xs uppercase tracking-widest">Step {i + 1} — {step}</p>
              <p>{body}</p>
            </div>
          ))}
          <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-xl p-4">
            <p className="text-yellow-300 font-bold text-xs uppercase tracking-widest mb-2">💡 Tips</p>
            <ul className="space-y-1.5 text-white/60 text-xs">
              {["Pick volatile slots with high max multipliers", "Your slot is locked for the whole tournament — choose wisely", "Once you confirm, there's no going back", "Watch the stream live for the best experience!"].map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
          <p className="text-white/40 text-xs border-t border-white/5 pt-4">Be in stream when it goes live 👊</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TournamentPage() {
  const [user, setUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [myEntry, setMyEntry] = useState<MyEntryResponse | null>(null);
  const [activeMatch, setActiveMatch] = useState<TournamentMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const [viewingPastId, setViewingPastId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    authFetch(API_ENDPOINTS.AUTH_ME)
      .then((r) => r.json()).then((d) => { if (d.user) setUser(d.user); }).catch(() => {});
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      const data = await tournamentApi.getAll();
      setTournaments(data);
      const active = data.find((t) =>
        [TournamentStatus.IN_PROGRESS, TournamentStatus.REGISTRATION, TournamentStatus.SLOT_SELECTION].includes(t.status)
      );
      if (active) setSelected(active);
    } catch { setError("Failed to load tournaments"); }
    finally { setLoading(false); }
  }, []);

  const loadMyEntry = useCallback(async (tournamentId: string) => {
    if (!user) return;
    try { setMyEntry(await tournamentApi.getMyEntry(tournamentId)); }
    catch { setMyEntry(null); }
  }, [user]);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);
  useEffect(() => { if (selected) loadMyEntry(selected.id); }, [selected?.id, selected?.status, loadMyEntry]);

  useEffect(() => {
    if (!selected) return;
    const socket = getSocket();
    socket.emit("joinTournament", selected.id);
    socket.on("tournament:updated", (updated: Tournament) => {
      if (updated.id === selected.id) { setSelected(updated); setTournaments((prev) => prev.map((t) => t.id === updated.id ? updated : t)); }
    });
    return () => { socket.emit("leaveTournament", selected.id); socket.off("tournament:updated"); };
  }, [selected?.id]);

  const handleEnter = async () => {
    if (!selected || !user) return;
    setActionLoading(true); setError(null);
    try { await tournamentApi.enter(selected.id); await loadMyEntry(selected.id); setSelected(await tournamentApi.getById(selected.id)); }
    catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!selected || !user) return;
    setActionLoading(true); setError(null);
    try { await tournamentApi.leave(selected.id); await loadMyEntry(selected.id); setSelected(await tournamentApi.getById(selected.id)); }
    catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleSetInitialSlot = async (slotCall: string) => {
    if (!selected) return;
    setActionLoading(true); setError(null);
    try { setSelected(await tournamentApi.setInitialSlot(selected.id, slotCall)); await loadMyEntry(selected.id); setActiveMatch(null); }
    catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  const myParticipant = myEntry?.participant;
  const needsInitialSlot = (
    selected?.status === TournamentStatus.SLOT_SELECTION ||
    selected?.status === TournamentStatus.IN_PROGRESS
  ) && myEntry?.isParticipant && myParticipant && !myParticipant.slotConfirmed;

  const activeTournament = selected && [TournamentStatus.REGISTRATION, TournamentStatus.SLOT_SELECTION, TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED].includes(selected.status) ? selected : null;
  const pastTournaments = tournaments.filter((t) => t.status === TournamentStatus.COMPLETED || t.status === TournamentStatus.CANCELLED);
  const visiblePast = showAllPast ? pastTournaments : pastTournaments.slice(0, 3);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-20">

        {/* ── Back button ────────────────────────────────────────── */}
        <div className="mb-8">
          <Link
            href="/stream-games"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Stream Games
          </Link>
        </div>

        {/* ── Hero title ─────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 leading-none">
            <span className="text-white">SLOT </span>
            <span style={{
              background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 40%, #d97706 70%, #fbbf24 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 40px rgba(245,158,11,0.3)",
            }}>
              TOURNAMENT
            </span>
          </h1>
          <p className="text-white/45 text-base sm:text-lg max-w-lg mx-auto">
            Watch the bracket play out as winners advance. New tournaments drop each season.
          </p>
          {/* Buttons */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setShowInstructions(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition-colors">
              🎮 How to Play
            </button>
            <button onClick={() => setShowRules(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition-colors">
              📋 Rules
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* ── Back button when viewing a past tournament ─────────── */}
        {viewingPastId && (
          <div className="mb-5">
            <button
              onClick={() => {
                setViewingPastId(null);
                const live = tournaments.find((t) =>
                  [TournamentStatus.IN_PROGRESS, TournamentStatus.REGISTRATION, TournamentStatus.SLOT_SELECTION].includes(t.status)
                );
                setSelected(live ?? null);
              }}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              ← Back to Tournaments
            </button>
          </div>
        )}

        {/* ── Active tournament ──────────────────────────────────── */}
        {!activeTournament ? (
          <div className="bg-white/3 border border-white/8 rounded-2xl px-8 py-14 text-center mb-14">
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mb-3">No Active Tournament</p>
            <p className="text-white/50 text-base">Check back soon — the next slot bracket will appear here when it kicks off.</p>
          </div>
        ) : (
          <div className="mb-14 bg-white/3 border border-yellow-400/20 rounded-2xl p-6">
            {/* Tournament info bar */}
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{activeTournament.title}</h2>
                <StatusBadge status={activeTournament.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-white/40">
                <span>{activeTournament.maxPlayers} slots</span>
                <span>·</span>
                <span>{activeTournament.entryCount} entered</span>
                {activeTournament.status === TournamentStatus.REGISTRATION && user && (
                  myEntry?.entered ? (
                    <button onClick={handleLeave} disabled={actionLoading}
                      className="px-4 py-2 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 text-sm font-medium transition-colors">
                      Leave Draw
                    </button>
                  ) : (
                    <button onClick={handleEnter} disabled={actionLoading}
                      className="px-5 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm transition-colors">
                      {actionLoading ? "Entering…" : "Enter Draw"}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Slot selection participants */}
            {activeTournament.status === TournamentStatus.SLOT_SELECTION && (
              <div className="bg-white/3 border border-white/8 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Participants — naming slots</p>
                  <SlotTimerCountdown deadline={activeTournament.participants[0]?.slotDeadline ?? null} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeTournament.participants.map((p) => (
                    <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${p.slotConfirmed ? "bg-green-500/10 border-green-500/20 text-green-300" : "bg-white/5 border-white/10 text-white/70"}`}>
                      {p.avatarUrl && <img src={p.avatarUrl} alt="" className="w-4 h-4 rounded-full" />}
                      <span>{p.displayName}</span>
                      {p.currentSlot && <span className="text-xs text-white/40">· {p.currentSlot}</span>}
                      {p.slotConfirmed ? <span className="text-green-400 text-xs">✓</span> : <span className="text-yellow-400 text-xs animate-pulse">⏳</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My slot alert */}
            {needsInitialSlot && (
              <div className="mb-4 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-yellow-300">You&apos;ve been selected! 🎉</p>
                  <p className="text-sm text-white/50 mt-0.5">
                    {myParticipant?.slotDeadline && new Date() > new Date(myParticipant.slotDeadline)
                      ? "Timer expired — pick your slot now before the admin rerolls you."
                      : "Name your slot call before the timer runs out."}
                  </p>
                </div>
                <button onClick={() => setActiveMatch({ id: "initial", round: 0, matchNumber: 0, status: MatchStatus.SLOT_SELECTION, winnerId: null, nextMatchId: null, slotDeadline: myParticipant?.slotDeadline ?? null, participants: [] })}
                  className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 text-sm shrink-0 transition-colors">
                  Select Slot
                </button>
              </div>
            )}

            {/* Bracket */}
            {[TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED].includes(activeTournament.status) && (
              <div className="mt-2">
                <TournamentBracket tournament={activeTournament} myParticipantId={myParticipant?.id} />
              </div>
            )}
          </div>
        )}

        {/* ── Recent tournaments ─────────────────────────────────── */}
        {pastTournaments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Recent Tournaments</p>
              {pastTournaments.length > 3 && (
                <button onClick={() => setShowAllPast(!showAllPast)}
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-wider">
                  {showAllPast ? "Show Less ↑" : "View All →"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visiblePast.map((t) => (
                <div key={t.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View past tournament: ${t.title}`}
                  onClick={() => { setSelected(t); setViewingPastId(t.id); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(t);
                      setViewingPastId(t.id);
                    }
                  }}
                  className="bg-white/3 border border-white/8 rounded-xl p-5 cursor-pointer hover:bg-white/5 hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 transition-all group">
                  <p className="text-white/35 text-xs mb-2 font-medium">
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                  </p>
                  <p className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-yellow-200 transition-colors">{t.title}</p>
                  <p className="text-white/40 text-sm">{t.maxPlayers} slots</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      {activeMatch?.id === "initial" && (
        <SlotModal title="Name Your Slot" currentSlot={myParticipant?.currentSlot ?? null} deadline={myParticipant?.slotDeadline ?? null}
          onSubmit={handleSetInitialSlot} onClose={() => setActiveMatch(null)} canConfirm={false} isLoading={actionLoading} />
      )}
    </div>
  );
}
