"use client";

import { Tournament, TournamentMatch, MatchStatus, TournamentParticipant } from "@/types/tournament";

interface Props {
  tournament: Tournament;
  myParticipantId?: string;
  onMatchClick?: (match: TournamentMatch) => void;
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
  match,
  participants,
  onClick,
  highlight,
}: {
  match: TournamentMatch;
  participants: TournamentParticipant[];
  onClick?: () => void;
  highlight?: boolean;
}) {
  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));

  return (
    <div
      onClick={onClick}
      className={`
        relative w-64 rounded-xl border bg-[#0f1117] overflow-hidden select-none
        transition-all duration-200
        ${STATUS_GLOW[match.status] ?? "border-white/8"}
        ${onClick ? "cursor-pointer hover:scale-[1.02] hover:brightness-110" : "cursor-default"}
        ${highlight ? "ring-2 ring-yellow-400/50" : ""}
      `}
    >
      {/* Status bar */}
      <div className={`h-[3px] w-full ${STATUS_BAR[match.status] ?? "bg-white/5"}`} />

      {/* Player rows */}
      {match.participants.map((mp, i) => {
        const p = participantMap[mp.participantId];
        const isWinner = match.winnerId === mp.participantId;
        const isLoser = match.status === MatchStatus.COMPLETED && !isWinner;

        return (
          <div
            key={mp.id}
            className={`
              flex items-center gap-2.5 px-3 py-2.5
              ${i === 0 ? "border-b border-white/8" : ""}
              ${isWinner ? "bg-gradient-to-r from-yellow-500/15 to-transparent" : ""}
              ${isLoser ? "opacity-35" : ""}
            `}
          >
            {/* Seed */}
            <span className="text-[10px] text-white/25 w-3.5 shrink-0 font-mono">{p?.seed ?? "—"}</span>

            {/* Avatar */}
            {p?.avatarUrl ? (
              <img src={p.avatarUrl} alt="" className={`w-6 h-6 rounded-full shrink-0 ring-1 ${isWinner ? "ring-yellow-400/60" : "ring-white/10"}`} />
            ) : (
              <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ring-1 ${isWinner ? "bg-yellow-400/20 text-yellow-300 ring-yellow-400/40" : "bg-white/8 text-white/40 ring-white/10"}`}>
                {p?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            {/* Name */}
            <span className={`truncate flex-1 text-sm font-medium ${isLoser ? "line-through text-white/40" : isWinner ? "text-yellow-300" : "text-white/90"}`}>
              {p?.displayName ?? "TBD"}
            </span>

            {/* Slot badge */}
            {mp.slotCall && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 font-medium whitespace-nowrap ${
                mp.slotConfirmed
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-white/5 text-white/40 border border-white/10"
              }`}>
                {mp.slotCall}
              </span>
            )}

            {isWinner && <span className="text-base shrink-0">👑</span>}
          </div>
        );
      })}

      {/* TBD slots */}
      {Array.from({ length: Math.max(0, 2 - match.participants.length) }).map((_, i) => (
        <div key={`tbd-${i}`} className={`flex items-center gap-2.5 px-3 py-2.5 ${i === 0 && match.participants.length === 0 ? "border-b border-white/8" : ""}`}>
          <span className="text-[10px] text-white/15 w-3.5 font-mono">—</span>
          <div className="w-6 h-6 rounded-full bg-white/5 ring-1 ring-white/8 shrink-0" />
          <span className="text-sm text-white/20 italic">TBD</span>
        </div>
      ))}

      {/* Active pulse indicator */}
      {match.status === MatchStatus.ACTIVE && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
    </div>
  );
}

export default function TournamentBracket({ tournament, myParticipantId, onMatchClick }: Props) {
  const { matches, participants, currentRound } = tournament;

  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  const matchesByRound: Record<number, TournamentMatch[]> = {};
  for (let r = 1; r <= totalRounds; r++) {
    matchesByRound[r] = matches.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
  }

  const MATCH_HEIGHT = 96;
  const ROUND_WIDTH = 290;
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
              {/* Round label */}
              <div className="absolute top-0 left-0 right-0 flex justify-center">
                <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${getRoundColor(round)}`}>
                  {getRoundLabel(round)}
                </span>
              </div>

              {/* Match cards */}
              {roundMatches.map((match, mi) => {
                const topY = TOP_OFFSET + mi * spacing + cardOffset;
                const isActive = match.status === MatchStatus.SLOT_SELECTION || match.status === MatchStatus.ACTIVE;

                return (
                  <div key={match.id} className="absolute" style={{ top: topY, left: 20, right: 20 }}>
                    <MatchCard
                      match={match}
                      participants={participants}
                      onClick={isActive && onMatchClick ? () => onMatchClick(match) : undefined}
                      highlight={myMatchIds.has(match.id) && isActive}
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
                {/* Trophy */}
                <div className="text-5xl mb-2 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">🏆</div>

                {/* Avatar */}
                {winner.avatarUrl ? (
                  <img src={winner.avatarUrl} alt="" className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-yellow-400/20 ring-2 ring-yellow-400/60 mx-auto mb-2 flex items-center justify-center text-xl font-bold text-yellow-300">
                    {winner.displayName[0].toUpperCase()}
                  </div>
                )}

                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-1">Champion</div>
                <div className="text-white font-bold text-sm leading-tight">{winner.displayName}</div>
                {winner.currentSlot && (
                  <div className="text-white/40 text-[10px] mt-1 italic">{winner.currentSlot}</div>
                )}
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
