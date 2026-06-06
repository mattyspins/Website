"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { Tournament, TournamentStatus, MatchStatus, TournamentMatch } from "@/types/tournament";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
  DRAFT:          { label: "Draft",            dot: "bg-white/30",                text: "text-white/40" },
  REGISTRATION:   { label: "Registration",     dot: "bg-blue-400",                text: "text-blue-300" },
  SLOT_SELECTION: { label: "Picking Slots",    dot: "bg-amber-400 animate-pulse", text: "text-amber-300" },
  IN_PROGRESS:    { label: "Live",             dot: "bg-green-400 animate-pulse", text: "text-green-300" },
  COMPLETED:      { label: "Completed",        dot: "bg-yellow-400",              text: "text-yellow-300" },
  CANCELLED:      { label: "Cancelled",        dot: "bg-red-400",                 text: "text-red-300" },
};

function MatchCard({ match, tournament }: { match: TournamentMatch; tournament: Tournament }) {
  const [p1, p2] = match.participants;
  const winner = match.winnerId
    ? match.participants.find(p => p.participantId === match.winnerId || p.userId === match.winnerId)
    : null;

  return (
    <div className={`rounded-lg px-2 py-1.5 border ${match.status === MatchStatus.ACTIVE ? "bg-green-900/30 border-green-500/30" : "bg-white/5 border-white/10"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] text-white/30 uppercase tracking-wider">Match {match.matchNumber} · R{match.round}</span>
        {match.status === MatchStatus.ACTIVE && (
          <span className="text-[8px] text-green-400 font-semibold animate-pulse">● Live</span>
        )}
        {match.status === MatchStatus.COMPLETED && winner && (
          <span className="text-[8px] text-yellow-400 font-semibold">✓ {winner.displayName}</span>
        )}
      </div>
      {[p1, p2].filter(Boolean).map((p, i) => {
        const isWinner = match.winnerId && (p.participantId === match.winnerId || p.userId === match.winnerId);
        return (
          <div key={p.participantId} className={`flex items-center gap-1 min-w-0 ${i === 0 ? "mb-0.5" : ""}`}>
            <span className={`text-[9px] font-semibold truncate ${isWinner ? "text-yellow-300" : "text-white/70"}`}>
              {p.displayName}
            </span>
            {p.slotCall && (
              <span className="text-[8px] text-white/30 truncate">🎰 {p.slotCall}</span>
            )}
            {!p.slotCall && match.status === MatchStatus.SLOT_SELECTION && (
              <span className="text-[8px] text-amber-400/60 animate-pulse">choosing…</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TournamentWidget() {
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "html,body{background:transparent!important;margin:0;padding:0}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const findActiveTournament = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tournaments`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const active = (data.tournaments as Tournament[]).find(t =>
        [TournamentStatus.REGISTRATION, TournamentStatus.SLOT_SELECTION, TournamentStatus.IN_PROGRESS].includes(t.status as TournamentStatus)
      ) ?? (data.tournaments as Tournament[]).find(t => t.status === TournamentStatus.COMPLETED) ?? null;
      setTournament(prev => {
        if (active?.id !== prev?.id) return active;
        return active;
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    findActiveTournament();
    const id = setInterval(findActiveTournament, 30_000);
    return () => clearInterval(id);
  }, [findActiveTournament]);

  // Real-time socket subscription
  useEffect(() => {
    if (!tournament) return;
    const socket = getSocket();
    socket.emit("joinTournament", tournament.id);
    const handleUpdate = (updated: Tournament) => {
      if (updated.id !== tournament.id) return;
      setTournament(updated);
      if (updated.status === TournamentStatus.COMPLETED || updated.status === TournamentStatus.CANCELLED) {
        setTimeout(findActiveTournament, 10_000);
      }
    };
    socket.on("tournament:updated", handleUpdate);
    return () => {
      socket.emit("leaveTournament", tournament.id);
      socket.off("tournament:updated", handleUpdate);
    };
  }, [tournament?.id, findActiveTournament]);

  if (!tournament) {
    return (
      <div className="p-2">
        <div className="bg-black/60 border border-white/10 rounded-lg p-4 text-center" style={{ width: 220 }}>
          <p className="text-2xl mb-1">🏆</p>
          <p className="text-white/50 text-[10px] tracking-widest uppercase">No active tournament…</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CFG[tournament.status] ?? STATUS_CFG.DRAFT;
  const activeMatches = tournament.matches.filter(m =>
    m.status === MatchStatus.ACTIVE || m.status === MatchStatus.SLOT_SELECTION
  );
  const remaining = tournament.participants.filter(p => !p.eliminated).length;
  const champion = tournament.status === TournamentStatus.COMPLETED
    ? tournament.participants.find(p => p.finalPosition === 1)
    : null;

  // Recent completed matches (last 3)
  const recentMatches = [...tournament.matches]
    .filter(m => m.status === MatchStatus.COMPLETED)
    .slice(-3)
    .reverse();

  return (
    <div className="p-1.5 space-y-1.5 font-sans select-none" style={{ width: 220 }}>

      {/* Header */}
      <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs shrink-0">🏆</span>
          <span className="text-white font-semibold text-[10px] truncate">{tournament.title}</span>
        </div>
        <div className={`flex items-center gap-1 shrink-0 ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span className="text-[9px] font-medium">{cfg.label}</span>
        </div>
      </div>

      {/* Champion (completed) */}
      {champion && (
        <div className="bg-yellow-900/40 border border-yellow-500/40 rounded-lg px-2 py-2 text-center">
          <p className="text-yellow-500/60 text-[8px] uppercase tracking-wider font-bold mb-0.5">🏆 Champion</p>
          <p className="text-yellow-300 font-black text-sm truncate">{champion.displayName}</p>
          {champion.currentSlot && (
            <p className="text-yellow-200/50 text-[8px] truncate">🎰 {champion.currentSlot}</p>
          )}
        </div>
      )}

      {/* Round info (in progress) */}
      {tournament.status === TournamentStatus.IN_PROGRESS && (
        <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between">
          <span className="text-white/60 text-[9px] font-semibold">Round {tournament.currentRound}</span>
          <span className="text-white/40 text-[9px]">{remaining} players left</span>
        </div>
      )}

      {/* Registration info */}
      {tournament.status === TournamentStatus.REGISTRATION && (
        <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1.5 text-center">
          <p className="text-blue-300 text-[10px] font-semibold">{tournament.entryCount} / {tournament.maxPlayers} entered</p>
          <p className="text-white/30 text-[8px] mt-0.5">Registration is open</p>
        </div>
      )}

      {/* Slot selection */}
      {tournament.status === TournamentStatus.SLOT_SELECTION && (
        <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1.5">
          <p className="text-white/30 text-[8px] uppercase tracking-wider mb-1">Picking Slots</p>
          <div className="space-y-0.5">
            {tournament.participants.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[8px] shrink-0 ${p.slotConfirmed ? "text-green-400" : "text-amber-400"}`}>
                  {p.slotConfirmed ? "✓" : "⏳"}
                </span>
                <span className="text-[9px] text-white/70 truncate">{p.displayName}</span>
                {p.currentSlot && (
                  <span className="text-[8px] text-white/30 truncate ml-auto">{p.currentSlot}</span>
                )}
              </div>
            ))}
            {tournament.participants.length > 8 && (
              <p className="text-white/25 text-[8px]">+{tournament.participants.length - 8} more</p>
            )}
          </div>
        </div>
      )}

      {/* Active matches */}
      {activeMatches.length > 0 && (
        <div className="space-y-1">
          {activeMatches.map(m => (
            <MatchCard key={m.id} match={m} tournament={tournament} />
          ))}
        </div>
      )}

      {/* Recent results */}
      {tournament.status === TournamentStatus.IN_PROGRESS && recentMatches.length > 0 && (
        <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1.5">
          <p className="text-white/30 text-[8px] uppercase tracking-wider mb-1">Recent Results</p>
          <div className="space-y-0.5">
            {recentMatches.map(m => {
              const winner = m.participants.find(p => p.participantId === m.winnerId || p.userId === m.winnerId);
              const loser = m.participants.find(p => p.participantId !== m.winnerId && p.userId !== m.winnerId);
              return (
                <div key={m.id} className="flex items-center gap-1 min-w-0">
                  <span className="text-green-400 text-[8px] shrink-0">✓</span>
                  <span className="text-green-300 text-[9px] truncate font-semibold">{winner?.displayName}</span>
                  <span className="text-white/25 text-[8px] shrink-0">vs</span>
                  <span className="text-white/35 text-[8px] truncate">{loser?.displayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
