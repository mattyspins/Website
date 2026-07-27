"use client";

import { useState } from "react";
import { Tournament, TournamentMatch, MatchStatus, TournamentParticipant } from "@/types/tournament";
import { findSlot } from "@/lib/slotGames";
import { SlotImage } from "@/components/SlotPicker";

interface Props {
  tournament: Tournament;
  myParticipantId?: string;
  onMatchClick?: (match: TournamentMatch) => void;
  isAdmin?: boolean;
  onDeclareWinner?: (matchId: string, winnerId: string) => void;
  onRevertWinner?: (matchId: string) => void;
  onSetMatchResult?: (matchId: string, participantId: string, resultText: string) => void;
  onPauseMatch?: (matchId: string) => void;
  onResumeMatch?: (matchId: string) => void;
  actionLoading?: boolean;
}

const STATUS_GLOW: Record<string, string> = {
  [MatchStatus.ACTIVE]: "shadow-[0_0_16px_var(--tt-gold-border)] border-[color:var(--tt-gold-border)]",
  [MatchStatus.PAUSED]: "shadow-[0_0_16px_rgba(250,204,21,0.15)] border-amber-400/40",
  [MatchStatus.COMPLETED]: "border-white/8",
  [MatchStatus.PENDING]: "border-white/6",
};

const STATUS_BAR: Record<string, string> = {
  [MatchStatus.ACTIVE]: "bg-[color:var(--tt-gold)]",
  [MatchStatus.PAUSED]: "bg-gradient-to-r from-amber-400 to-amber-600",
  [MatchStatus.COMPLETED]: "bg-white/10",
  [MatchStatus.PENDING]: "bg-white/5",
};

function MatchCard({
  match, participants, highlight,
  isAdmin, onDeclareWinner, onRevertWinner, onSetMatchResult, onPauseMatch, onResumeMatch, actionLoading,
}: {
  match: TournamentMatch;
  participants: TournamentParticipant[];
  highlight?: boolean;
  isAdmin?: boolean;
  onDeclareWinner?: (matchId: string, winnerId: string) => void;
  onRevertWinner?: (matchId: string) => void;
  onSetMatchResult?: (matchId: string, participantId: string, resultText: string) => void;
  onPauseMatch?: (matchId: string) => void;
  onResumeMatch?: (matchId: string) => void;
  actionLoading?: boolean;
}) {
  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));
  const canDeclare = isAdmin && onDeclareWinner &&
    (match.status === MatchStatus.ACTIVE || match.status === MatchStatus.PAUSED) &&
    match.participants.length === 2;
  const canRevert = isAdmin && onRevertWinner && match.status === MatchStatus.COMPLETED;
  const canPause = isAdmin && onPauseMatch && match.status === MatchStatus.ACTIVE;
  const canResume = isAdmin && onResumeMatch && match.status === MatchStatus.PAUSED;

  const [results, setResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(match.participants.map((mp) => [mp.participantId, mp.resultText ?? ""]))
  );

  return (
    <div className={`
      relative w-72 rounded-xl border bg-[color:var(--tt-bg-elevated)] overflow-hidden select-none transition-all duration-200
      ${STATUS_GLOW[match.status] ?? "border-white/8"}
      ${highlight ? "ring-2 ring-[color:var(--tt-gold-border)]" : ""}
    `}>
      {/* Status bar */}
      <div className={`h-[3px] w-full ${STATUS_BAR[match.status] ?? "bg-white/5"}`} />

      {/* Player rows */}
      {match.participants.map((mp, i) => {
        const p = participantMap[mp.participantId];
        const isWinner = match.winnerId === mp.participantId;
        const isLoser = match.status === MatchStatus.COMPLETED && !isWinner;
        const slotGame = mp.slotCall ? findSlot(mp.slotCall) : null;

        return (
          <div key={mp.id} className={`
            flex items-center gap-2.5 px-3 py-2.5
            ${i === 0 ? "border-b border-white/8" : ""}
            ${isWinner ? "bg-[color:var(--tt-gold-soft)]" : ""}
            ${isLoser ? "opacity-35" : ""}
          `}>
            <span className="text-[10px] text-white/45 w-3.5 shrink-0 font-mono mt-1">{p?.seed ?? "—"}</span>

            {slotGame ? (
              <SlotImage src={slotGame.image} name={slotGame.name} size={40} />
            ) : p?.avatarUrl ? (
              <img src={p.avatarUrl} alt="" className={`w-10 h-10 rounded-lg shrink-0 ring-1 ${isWinner ? "ring-[color:var(--tt-gold-border)]" : "ring-white/10"}`} />
            ) : (
              <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold ring-1 ${isWinner ? "bg-[color:var(--tt-gold-soft)] text-[color:var(--tt-gold)] ring-[color:var(--tt-gold-border)]" : "bg-white/8 text-white/50 ring-white/10"}`}>
                {p?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {slotGame && p?.avatarUrl && <img src={p.avatarUrl} alt="" className="w-4 h-4 rounded-full shrink-0" />}
                <div className={`text-sm font-semibold truncate ${isLoser ? "line-through text-white/50" : isWinner ? "text-[color:var(--tt-gold)]" : "text-white/90"}`}>
                  {p?.displayName ?? "TBD"}
                </div>
                {isWinner && <span className="text-sm shrink-0">👑</span>}
              </div>
              {mp.slotCall && (
                <div className="text-[11px] mt-0.5 font-medium truncate text-white/50">{mp.slotCall}</div>
              )}
              {mp.resultText && (
                <div className="text-[10px] text-[color:var(--tt-gold)]/70 mt-0.5 font-mono">{mp.resultText}</div>
              )}
            </div>

            {/* Admin: declare this participant the winner */}
            {canDeclare && p && (
              <button
                onClick={() => onDeclareWinner!(match.id, mp.participantId)}
                disabled={actionLoading}
                title={`Declare ${p.displayName} the winner`}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-[color:var(--tt-gold-soft)] hover:bg-[color:var(--tt-gold)]/30 text-[color:var(--tt-gold)] transition-all disabled:opacity-30 text-xs"
              >
                🏆
              </button>
            )}
          </div>
        );
      })}

      {/* TBD placeholders */}
      {Array.from({ length: Math.max(0, 2 - match.participants.length) }).map((_, i) => (
        <div key={`tbd-${i}`} className={`flex items-center gap-2.5 px-3 py-2.5 ${i === 0 && match.participants.length === 0 ? "border-b border-white/8" : ""}`}>
          <span className="text-[10px] text-white/45 w-3.5 font-mono">—</span>
          <div className="w-6 h-6 rounded-full bg-white/5 ring-1 ring-white/8 shrink-0" />
          <span className="text-sm text-white/45 italic">TBD</span>
        </div>
      ))}

      {/* Admin: result entry (persisted free-text score per side) */}
      {canDeclare && (
        <div className="border-t border-white/8 px-3 pt-2.5 pb-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Enter Results</p>
          {match.participants.map((mp) => {
            const p = participantMap[mp.participantId];
            return (
              <div key={mp.id} className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/50 w-20 truncate shrink-0 font-medium">
                  {p?.displayName ?? "?"}
                </span>
                <input
                  type="text"
                  placeholder="e.g. 312x"
                  value={results[mp.participantId] ?? ""}
                  onChange={(e) => setResults((prev) => ({ ...prev, [mp.participantId]: e.target.value }))}
                  onBlur={(e) => onSetMatchResult?.(match.id, mp.participantId, e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[color:var(--tt-gold-border)]"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Admin: pause/resume + revert */}
      {(canPause || canResume || canRevert) && (
        <div className="border-t border-white/5 px-3 py-1.5 flex items-center justify-end gap-3">
          {canPause && (
            <button
              onClick={() => onPauseMatch!(match.id)}
              disabled={actionLoading}
              className="flex items-center gap-1 text-[11px] text-amber-400/70 hover:text-amber-300 transition-colors disabled:opacity-30"
            >
              ⏸ pause
            </button>
          )}
          {canResume && (
            <button
              onClick={() => onResumeMatch!(match.id)}
              disabled={actionLoading}
              className="flex items-center gap-1 text-[11px] text-[color:var(--tt-gold)]/80 hover:text-[color:var(--tt-gold)] transition-colors disabled:opacity-30"
            >
              ▶ resume
            </button>
          )}
          {canRevert && (
            <button
              onClick={() => onRevertWinner!(match.id)}
              disabled={actionLoading}
              title="Revert result"
              className="flex items-center gap-1 text-[11px] text-orange-400/60 hover:text-orange-300 transition-colors disabled:opacity-30"
            >
              ↩ revert
            </button>
          )}
        </div>
      )}

      {match.status === MatchStatus.ACTIVE && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[color:var(--tt-gold)] animate-pulse" />
      )}
      {match.status === MatchStatus.PAUSED && (
        <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest text-amber-400/80 bg-amber-400/10 border border-amber-400/30 rounded px-1.5 py-0.5">
          Paused
        </div>
      )}
    </div>
  );
}

export default function TournamentBracket({
  tournament, myParticipantId,
  isAdmin, onDeclareWinner, onRevertWinner, onSetMatchResult, onPauseMatch, onResumeMatch, actionLoading,
}: Props) {
  const { matches, participants, currentRound } = tournament;
  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  const matchesByRound: Record<number, TournamentMatch[]> = {};
  for (let r = 1; r <= totalRounds; r++) {
    matchesByRound[r] = matches.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
  }

  // Admin cards are taller (result entry inputs add extra height)
  const MATCH_HEIGHT = isAdmin ? 230 : 130;
  const ROUND_WIDTH = 310;
  const TOP_OFFSET = 52;
  const maxMatchesR1 = matchesByRound[1]?.length ?? 1;
  const bracketHeight = maxMatchesR1 * MATCH_HEIGHT * 2 + TOP_OFFSET + 40;

  const getRoundLabel = (round: number) => {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi-Final";
    if (round === totalRounds - 2) return "Quarter-Final";
    if (round === totalRounds - 3) return "Round of 16";
    return `Round ${round}`;
  };

  const getRoundColor = (round: number) => {
    if (round === currentRound) return "bg-[color:var(--tt-gold-soft)] text-[color:var(--tt-gold)] border border-[color:var(--tt-gold-border)]";
    if (round < (currentRound || 0)) return "bg-white/5 text-white/45 border border-white/5";
    return "bg-white/5 text-white/50 border border-white/10";
  };

  const myMatchIds = new Set(
    matches.filter((m) => m.participants.some((mp) => mp.participantId === myParticipantId)).map((m) => m.id)
  );

  const winner = participants.find((p) => p.finalPosition === 1);

  return (
    <div className="overflow-x-auto pb-6">
      <div className="relative flex gap-0" style={{ minWidth: totalRounds * ROUND_WIDTH + 160, height: bracketHeight }}>
        {Array.from({ length: totalRounds }).map((_, ri) => {
          const round = ri + 1;
          const roundMatches = matchesByRound[round] ?? [];
          const count = roundMatches.length;
          const spacing = (bracketHeight - TOP_OFFSET - 40) / count;
          const cardOffset = (spacing - MATCH_HEIGHT) / 2;

          return (
            <div key={round} className="relative" style={{ width: ROUND_WIDTH }}>
              <div className="absolute top-0 left-0 right-0 flex justify-center">
                <span className={`tt-display text-[13px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${getRoundColor(round)}`}>
                  {getRoundLabel(round)}
                </span>
              </div>

              {roundMatches.map((match, mi) => {
                const topY = TOP_OFFSET + mi * spacing + cardOffset;
                return (
                  <div key={match.id} className="absolute" style={{ top: topY, left: 20, right: 20 }}>
                    <MatchCard
                      match={match}
                      participants={participants}
                      highlight={myMatchIds.has(match.id) && match.status === MatchStatus.ACTIVE}
                      isAdmin={isAdmin}
                      onDeclareWinner={onDeclareWinner}
                      onRevertWinner={onRevertWinner}
                      onSetMatchResult={onSetMatchResult}
                      onPauseMatch={onPauseMatch}
                      onResumeMatch={onResumeMatch}
                      actionLoading={actionLoading}
                    />
                  </div>
                );
              })}

              {/* Connector lines */}
              {round < totalRounds && roundMatches.map((match, mi) => {
                const nextRound = matchesByRound[round + 1] ?? [];
                const nextIdx = Math.floor(mi / 2);
                const nextMatch = nextRound[nextIdx];
                if (!nextMatch) return null;
                const nextCount = nextRound.length;
                const nextSpacing = (bracketHeight - TOP_OFFSET - 40) / nextCount;
                const nextCardOffset = (nextSpacing - MATCH_HEIGHT) / 2;
                const fromY = TOP_OFFSET + mi * spacing + cardOffset + MATCH_HEIGHT / 2;
                const toY = TOP_OFFSET + nextIdx * nextSpacing + nextCardOffset + MATCH_HEIGHT / 2;
                const isWinPath = match.status === MatchStatus.COMPLETED;
                return (
                  <svg key={`c-${match.id}`} className="absolute pointer-events-none" style={{ top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}>
                    <path
                      d={`M ${ROUND_WIDTH - 20} ${fromY} H ${ROUND_WIDTH - 6} V ${toY} H ${ROUND_WIDTH + 16}`}
                      fill="none"
                      stroke={isWinPath ? "oklch(0.82 0.19 130 / 0.35)" : "rgba(255,255,255,0.08)"}
                      strokeWidth={isWinPath ? "2" : "1.5"}
                      strokeDasharray={isWinPath ? "none" : "4 3"}
                    />
                  </svg>
                );
              })}
            </div>
          );
        })}

        {/* Champion column */}
        {totalRounds > 0 && (
          <div className="flex items-center justify-center pl-2" style={{ width: 160 }}>
            {tournament.status === "COMPLETED" && winner ? (
              <div className="text-center px-3">
                <div className="text-5xl mb-2 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">🏆</div>
                {winner.avatarUrl ? (
                  <img src={winner.avatarUrl} alt="" className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-[color:var(--tt-gold-border)] shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[color:var(--tt-gold-soft)] ring-2 ring-[color:var(--tt-gold-border)] mx-auto mb-2 flex items-center justify-center text-xl font-bold text-[color:var(--tt-gold)]">
                    {winner.displayName[0].toUpperCase()}
                  </div>
                )}
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--tt-gold)] mb-1">Champion</div>
                <div className="text-white font-bold text-sm leading-tight">{winner.displayName}</div>
                {winner.currentSlot && (() => {
                  const slotGame = findSlot(winner.currentSlot);
                  return slotGame ? (
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <SlotImage src={slotGame.image} name={slotGame.name} size={48} />
                      <p className="text-[10px] text-white/50 truncate max-w-[120px]">{slotGame.name}</p>
                    </div>
                  ) : (
                    <div className="text-white/50 text-[10px] mt-1 italic">{winner.currentSlot}</div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl opacity-20 mb-1">🏆</div>
                <div className="text-[10px] text-white/45 uppercase tracking-widest">Champion</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
