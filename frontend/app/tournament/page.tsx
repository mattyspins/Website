"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, TournamentStatus, MyEntryResponse } from "@/types/tournament";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";
import AgeGateModal from "@/components/tournament/AgeGateModal";
import RegisterTab from "@/components/tournament/RegisterTab";
import PlayersReservesTab from "@/components/tournament/PlayersReservesTab";
import BracketTab from "@/components/tournament/BracketTab";
import HistoryTab from "@/components/tournament/HistoryTab";

const ACTIVE_STATUSES = [
  TournamentStatus.REGISTRATION,
  TournamentStatus.LOCKED,
  TournamentStatus.DRAWN,
  TournamentStatus.IN_PROGRESS,
];

const PHASE_LABEL: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: "DRAFT",
  [TournamentStatus.REGISTRATION]: "REGISTRATION OPEN",
  [TournamentStatus.LOCKED]: "REGISTRATION LOCKED",
  [TournamentStatus.DRAWN]: "BRACKET DRAWN",
  [TournamentStatus.IN_PROGRESS]: "BRACKET LIVE",
  [TournamentStatus.COMPLETED]: "COMPLETED",
  [TournamentStatus.CANCELLED]: "CANCELLED",
};

type Tab = "register" | "players" | "bracket" | "history";
const TABS: { id: Tab; label: string }[] = [
  { id: "register", label: "REGISTER" },
  { id: "players", label: "PLAYERS & RESERVES" },
  { id: "bracket", label: "BRACKET" },
  { id: "history", label: "HISTORY" },
];

export default function TournamentPage() {
  const [user, setUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [myEntry, setMyEntry] = useState<MyEntryResponse | null>(null);
  const [tab, setTab] = useState<Tab>("register");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { if (d.user) setUser(d.user); }).catch(() => {});
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      const data = await tournamentApi.getAll();
      setTournaments(data);
      const active = data.find((t) => ACTIVE_STATUSES.includes(t.status));
      setSelected((prev) => {
        if (prev) return data.find((t) => t.id === prev.id) ?? active ?? null;
        return active ?? null;
      });
    } catch { setError("Failed to load tournaments"); }
    finally { setLoading(false); }
  }, []);

  const loadMyEntry = useCallback(async (tournamentId: string) => {
    if (!user) { setMyEntry(null); return; }
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
      if (updated.id === selected.id) {
        setSelected(updated);
        setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    });
    return () => { socket.emit("leaveTournament", selected.id); socket.off("tournament:updated"); };
  }, [selected?.id]);

  const handleEnter = async (slot: string) => {
    if (!selected || !user || !slot) return;
    setActionLoading(true); setError(null);
    try {
      await tournamentApi.enter(selected.id, slot);
      await loadMyEntry(selected.id);
      setSelected(await tournamentApi.getById(selected.id));
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const myParticipant = myEntry?.participant;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--tt-gold)]" />
    </div>
  );

  return (
    <div>
      <AgeGateModal />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-5 pt-8 pb-20">
        <div className="mb-6">
          <Link
            href="/stream-games"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Stream Games
          </Link>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {!selected ? (
          <div className="text-center py-16">
            <div className="tt-display text-3xl text-white mb-2">NO ACTIVE TOURNAMENT</div>
            <p className="text-white/50 text-sm">Check back soon — the next slot bracket will appear here when it kicks off.</p>
            {tournaments.some((t) => t.status === TournamentStatus.COMPLETED) && (
              <div className="mt-10 text-left">
                <HistoryTab tournaments={tournaments} />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between py-5 flex-wrap gap-3 border-b border-[color:var(--tt-border)]">
              <div>
                <div className="tt-display text-xs tracking-[0.25em] text-white/60">KNOCKOUT SLOT TOURNAMENT</div>
                <div className="tt-display text-4xl text-white leading-none">{selected.title}</div>
              </div>
              <div
                className={`flex items-center gap-2 px-3.5 py-2 rounded ${
                  selected.status === TournamentStatus.IN_PROGRESS
                    ? "bg-[color:var(--tt-pink-soft)] border border-[color:var(--tt-pink-border)]"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {selected.status === TournamentStatus.IN_PROGRESS && (
                  <span className="tt-pulse w-2 h-2 rounded-full bg-[color:var(--tt-pink)]" />
                )}
                <span className={`tt-display text-sm tracking-wide ${selected.status === TournamentStatus.IN_PROGRESS ? "text-[color:var(--tt-pink)]" : "text-white/60"}`}>
                  {PHASE_LABEL[selected.status]}{selected.status === TournamentStatus.IN_PROGRESS ? ` — ROUND ${selected.currentRound}` : ""}
                </span>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              {[
                { label: "Registered", value: selected.entryCount },
                { label: "Bracket size", value: selected.maxPlayers },
                { label: "Reserves", value: selected.reserveCount },
                { label: "Prize pool", value: selected.prizePoolDisplay ?? "—", accent: true },
              ].map((tile) => (
                <div key={tile.label} className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded px-4 py-3.5">
                  <div className="text-[11px] uppercase tracking-wide text-white/55">{tile.label}</div>
                  <div className={`tt-display text-2xl ${tile.accent ? "text-[color:var(--tt-gold)]" : "text-white"}`}>{tile.value}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-5 border-b border-[color:var(--tt-border)] overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 tt-display text-sm tracking-wide whitespace-nowrap border-b-2 transition-colors ${
                    tab === t.id ? "text-white border-[color:var(--tt-gold)]" : "text-white/50 border-transparent hover:text-white/80"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "register" && (
              <RegisterTab
                tournament={selected}
                myEntry={myEntry}
                isLoggedIn={!!user}
                actionLoading={actionLoading}
                onEnter={handleEnter}
              />
            )}
            {tab === "players" && <PlayersReservesTab tournament={selected} />}
            {tab === "bracket" && <BracketTab tournament={selected} myParticipantId={myParticipant?.id} />}
            {tab === "history" && <HistoryTab tournaments={tournaments} />}
          </>
        )}
      </div>
    </div>
  );
}
