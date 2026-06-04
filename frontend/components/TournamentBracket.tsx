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
  onRerollParticipant?: (participantId: string) => void;
  actionLoading?: boolean;
}

const STATUS_GLOW: Record<string, string> = {
  [MatchStatus.ACTIVE]: "shadow-[0_0_16px_rgba(74,222,128,0.25)] border-green-500/40",
  [MatchStatus.SLOT_SELECTION]: "shadow-[0_0_16px_rgba(250,204,21,0.2)] border-yellow-400/40",
  [MatchStatus.COMPLETED]: "border-white/8",
  [MatchStatus.PENDING]: "border-white/6",
};

const STATUS_BAR: Record<string, string> = {
  [MatchStatus.ACTIVE]: "bg-gradient-to-r from-green-400 to-emerald-500",
  [MatchStatus.SLOT_SELECTION]: "bg-gradient-to-r from-yellow-400 to-amber-500",
  [MatchStatus.COMPLETED]: "bg-white/10",
  [MatchStatus.PENDING]: "bg-white/5",
};

function MatchCard({
  match, participants, highlight,
  isAdmin, onDeclareWinner, onRevertWinner, onRerollParticipant, actionLoading,
}: {
  match: TournamentMatch;
  participants: TournamentParticipant[];
  highlight?: boolean;
  isAdmin?: boolean;
  onDeclareWinner?: (matchId: string, winnerId: string) => void;
  onRevertWinner?: (matchId: string) => void;
  onRerollParticipant?: (participantId: string) => void;
  actionLoading?: boolean;
}) {
  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));
  const canDeclare = isAdmin && onDeclareWinner &&
    (match.status === MatchStatus.ACTIVE || match.status === MatchStatus.SLOT_SELECTION) &&
    match.participants.length === 2;
  const canRevert = isAdmin && onRevertWinner && match.status === MatchStatus.COMPLETED;

  // Multiplier result entry state (per participant)
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [payouts, setPayouts] = useState<Record<string, string>>({});

  const getMultiplier = (pid: string): number | null => {
    const cost = parseFloat(costs[pid] ?? "");
    const payout = parseFloat(payouts[pid] ?? "");
    if (!cost || cost <= 0 || isNaN(cost) || isNaN(payout) || payout < 0) return null;
    return payout / cost;
  };

  const allResultsEntered = canDeclare &&
    match.participants.every((mp) => getMultiplier(mp.participantId) !== null);

  const handleConfirmWinner = () => {
    if (!allResultsEntered || !onDeclareWinner) return;
    const ranked = match.participants
      .map((mp) => ({ id: mp.participantId, mult: getMultiplier(mp.participantId)! }))
      .sort((a, b) => b.mult - a.mult);
    onDeclareWinner(match.id, ranked[0].id);
  };

  return (
    <div className={`
      relative w-72 rounded-xl border bg-[#0f1117] overflow-hidden select-none transition-all duration-200
      ${STATUS_GLOW[match.status] ?? "border-white/8"}
      ${highlight ? "ring-2 ring-yellow-400/50" : ""}
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
            ${isWinner ? "bg-gradient-to-r from-yellow-500/15 to-transparent" : ""}
            ${isLoser ? "opacity-35" : ""}
          `}>
            <span className="text-[10px] text-white/25 w-3.5 shrink-0 font-mono mt-1">{p?.seed ?? "—"}</span>

            {slotGame ? (
              <SlotImage src={slotGame.image} name={slotGame.name} size={40} />
            ) : p?.avatarUrl ? (
              <img src={p.avatarUrl} alt="" className={`w-10 h-10 rounded-lg shrink-0 ring-1 ${isWinner ? "ring-yellow-400/60" : "ring-white/10"}`} />
            ) : (
              <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold ring-1 ${isWinner ? "bg-yellow-400/20 text-yellow-300 ring-yellow-400/40" : "bg-white/8 text-white/40 ring-white/10"}`}>
                {p?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {slotGame && p?.avatarUrl && <img src={p.avatarUrl} alt="" className="w-4 h-4 rounded-full shrink-0" />}
                <div className={`text-sm font-semibold truncate ${isLoser ? "line-through text-white/40" : isWinner ? "text-yellow-300" : "text-white/90"}`}>
                  {p?.displayName ?? "TBD"}
                </div>
                {isWinner && <span className="text-sm shrink-0">👑</span>}
              </div>
              {mp.slotCall && (
                <div className={`text-[11px] mt-0.5 font-medium truncate ${mp.slotConfirmed ? "text-green-400" : "text-white/50"}`}>
                  {mp.slotCall}
                </div>
              )}
              {/* Show recorded multiplier after match is completed */}
              {isWinner && match.status === MatchStatus.COMPLETED && (
                <div className="text-[10px] text-yellow-400/60 mt-0.5 font-mono">winner</div>
              )}
            </div>

            {/* Admin: reroll */}
            {isAdmin && onRerollParticipant && p && !p.slotConfirmed && match.status !== MatchStatus.COMPLETED && (
              <button
                onClick={() => onRerollParticipant(mp.participantId)}
                disabled={actionLoading}
                title="Reroll participant"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 transition-all disabled:opacity-30 text-xs"
              >
                🔄
              </button>
            )}
          </div>
        );
      })}

      {/* TBD placeholders */}
      {Array.from({ length: Math.max(0, 2 - match.participants.length) }).map((_, i) => (
        <div key={`tbd-${i}`} className={`flex items-center gap-2.5 px-3 py-2.5 ${i === 0 && match.participants.length === 0 ? "border-b border-white/8" : ""}`}>
          <span className="text-[10px] text-white/15 w-3.5 font-mono">—</span>
          <div className="w-6 h-6 rounded-full bg-white/5 ring-1 ring-white/8 shrink-0" />
          <span className="text-sm text-white/20 italic">TBD</span>
        </div>
      ))}

      {/* Admin: multiplier result entry */}
      {canDeclare && (
        <div className="border-t border-white/8 px-3 pt-2.5 pb-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">Enter Results</p>
          {match.participants.map((mp) => {
            const p = participantMap[mp.participantId];
            const mult = getMultiplier(mp.participantId);
            const otherMult = match.participants
              .filter((x) => x.participantId !== mp.participantId)
              .map((x) => getMultiplier(x.participantId))[0] ?? null;
            const isLeader = mult !== null && (otherMult === null || mult >= otherMult);
            return (
              <div key={mp.id} className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/50 w-16 truncate shrink-0 font-medium">
                  {p?.displayName ?? "?"}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Cost"
                  value={costs[mp.participantId] ?? ""}
                  onChange={(e) => setCosts((prev) => ({ ...prev, [mp.participantId]: e.target.value }))}
                  className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
                />
                <span className="text-white/20 text-xs shrink-0">÷</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Payout"
                  value={payouts[mp.participantId] ?? ""}
                  onChange={(e) => setPayouts((prev) => ({ ...prev, [mp.participantId]: e.target.value }))}
                  className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
                />
                <span className={`text-xs font-bold ml-0.5 w-12 shrink-0 ${isLeader && mult !== null ? "text-yellow-300" : "text-white/25"}`}>
                  {mult !== null ? `${mult.toFixed(2)}x` : "—"}
                  {isLeader && mult !== null && " ↑"}
                </span>
              </div>
            );
          })}
          <button
            onClick={handleConfirmWinner}
            disabled={!allResultsEntered || actionLoading}
            className="w-full mt-1 py-1.5 text-xs font-bold rounded-lg bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Winner
          </button>
        </div>
      )}

      {/* Admin: revert result on completed match */}
      {canRevert && (
        <div className="border-t border-white/5 px-3 py-1.5 flex justify-end">
          <button
            onClick={() => onRevertWinner!(match.id)}
            disabled={actionLoading}
            title="Revert result"
            className="flex items-center gap-1 text-[11px] text-orange-400/60 hover:text-orange-300 transition-colors disabled:opacity-30"
          >
            ↩ revert
          </button>
        </div>
      )}

      {match.status === MatchStatus.ACTIVE && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
    </div>
  );
}

export default function TournamentBracket({
  tournament, myParticipantId, onMatchClick,
  isAdmin, onDeclareWinner, onRevertWinner, onRerollParticipant, actionLoading,
}: Props) {
  const { matches, participants, currentRound } = tournament;
  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  const matchesByRound: Record<number, TournamentMatch[]> = {};
  for (let r = 1; r <= totalRounds; r++) {
    matchesByRound[r] = matches.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
  }

  // Admin cards are taller (result entry inputs add ~110px)
  const MATCH_HEIGHT = isAdmin ? 240 : 130;
  const ROUND_WIDTH = 310;
  const TOP_OFFSET = 52;
  const maxMatchesR1 = matchesByRound[1]?.length ?? 1;
  const bracketHeight = maxMatchesR1 * MATCH_HEIGHT * 2 + TOP_OFFSET + 40;

  const getRoundLabel = (round: number) => {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi-Final";
    if (round === totalRounds - 2) return "Quarter-Final";
    return `Round ${round}`;
  };

  const getRoundColor = (round: number) => {
    if (round === currentRound) return "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30";
    if (round < (currentRound || 0)) return "bg-white/5 text-white/30 border border-white/5";
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
                <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${getRoundColor(round)}`}>
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
                      onRerollParticipant={onRerollParticipant}
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
                      stroke={isWinPath ? "rgba(250,204,21,0.35)" : "rgba(255,255,255,0.08)"}
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
                  <img src={winner.avatarUrl} alt="" className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-yellow-400/20 ring-2 ring-yellow-400/60 mx-auto mb-2 flex items-center justify-center text-xl font-bold text-yellow-300">
                    {winner.displayName[0].toUpperCase()}
                  </div>
                )}
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-1">Champion</div>
                <div className="text-white font-bold text-sm leading-tight">{winner.displayName}</div>
                {winner.currentSlot && <div className="text-white/40 text-[10px] mt-1 italic">{winner.currentSlot}</div>}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl opacity-20 mb-1">🏆</div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest">Champion</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
