"use client";

import { Tournament, TournamentMatch, MatchStatus, TournamentParticipant } from "@/types/tournament";

interface Props {
  tournament: Tournament;
  myParticipantId?: string;
  onMatchClick?: (match: TournamentMatch) => void;
}

function getWinnerParticipantId(match: TournamentMatch): string | null {
  return match.winnerId ?? null;
}

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
        relative w-52 rounded border cursor-default select-none overflow-hidden
        transition-all duration-200
        ${highlight ? "border-yellow-400 shadow-yellow-400/30 shadow-lg" : "border-white/10"}
        ${onClick ? "cursor-pointer hover:border-white/30" : ""}
        ${match.status === MatchStatus.COMPLETED ? "opacity-80" : ""}
      `}
    >
      {/* Round indicator strip */}
      <div
        className={`h-0.5 w-full ${
          match.status === MatchStatus.ACTIVE
            ? "bg-green-400"
            : match.status === MatchStatus.SLOT_SELECTION
            ? "bg-yellow-400"
            : match.status === MatchStatus.COMPLETED
            ? "bg-white/20"
            : "bg-white/10"
        }`}
      />

      {match.participants.map((mp, i) => {
        const p = participantMap[mp.participantId];
        const isWinner = match.winnerId === mp.participantId;
        const isLoser = match.status === MatchStatus.COMPLETED && !isWinner;

        return (
          <div
            key={mp.id}
            className={`
              flex items-center gap-2 px-3 py-2 text-sm
              ${i === 0 ? "border-b border-white/10" : ""}
              ${isWinner ? "bg-yellow-400/10 text-yellow-300" : ""}
              ${isLoser ? "opacity-40 line-through" : "text-white"}
            `}
          >
            {/* Seed badge */}
            {p?.seed && (
              <span className="text-xs text-white/40 w-4 shrink-0">{p.seed}</span>
            )}

            {/* Avatar */}
            {p?.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt=""
                className="w-5 h-5 rounded-full shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/40">
                {p?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            {/* Name */}
            <span className="truncate flex-1 font-medium">
              {p?.displayName ?? "TBD"}
            </span>

            {/* Slot call */}
            {mp.slotCall && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                  mp.slotConfirmed
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-white/5 text-white/50 border border-white/10"
                }`}
              >
                {mp.slotCall}
              </span>
            )}

            {/* Trophy for winner */}
            {isWinner && <span className="text-yellow-400 shrink-0">🏆</span>}
          </div>
        );
      })}

      {/* Empty slots */}
      {Array.from({ length: Math.max(0, 2 - match.participants.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className={`flex items-center gap-2 px-3 py-2 text-sm text-white/20 italic ${
            i === 0 && match.participants.length === 0 ? "border-b border-white/10" : ""
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white/5 shrink-0" />
          <span>TBD</span>
        </div>
      ))}
    </div>
  );
}

function ConnectorLine({ fromTop, toTop, x }: { fromTop: number; toTop: number; x: number }) {
  const midY = (fromTop + toTop) / 2;
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: 0, top: 0, width: "100%", height: "100%" }}
      overflow="visible"
    >
      <path
        d={`M ${x} ${fromTop} H ${x + 20} V ${toTop} H ${x + 40}`}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function TournamentBracket({ tournament, myParticipantId, onMatchClick }: Props) {
  const { matches, participants, currentRound } = tournament;

  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;

  // Group matches by round
  const matchesByRound: Record<number, TournamentMatch[]> = {};
  for (let r = 1; r <= totalRounds; r++) {
    matchesByRound[r] = matches
      .filter((m) => m.round === r)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  }

  const MATCH_HEIGHT = 90; // px per match card
  const MATCH_GAP = 24;    // gap between cards in same round
  const ROUND_WIDTH = 240; // width per round column

  const maxMatchesInR1 = matchesByRound[1]?.length ?? 1;
  const bracketHeight = maxMatchesInR1 * MATCH_HEIGHT + (maxMatchesInR1 - 1) * MATCH_GAP + 80;

  const getRoundLabel = (round: number) => {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi-Final";
    if (round === totalRounds - 2) return "Quarter-Final";
    return `Round ${round}`;
  };

  const myMatches = new Set(
    matches
      .filter((m) =>
        m.participants.some((mp) => mp.participantId === myParticipantId)
      )
      .map((m) => m.id)
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative flex gap-0"
        style={{ minWidth: totalRounds * ROUND_WIDTH + 120, height: bracketHeight }}
      >
        {Array.from({ length: totalRounds }).map((_, ri) => {
          const round = ri + 1;
          const roundMatches = matchesByRound[round] ?? [];
          const matchesInRound = roundMatches.length;
          const totalMatchesR1 = matchesByRound[1]?.length ?? 1;

          // Space matches evenly within the bracket height
          const spacing = (bracketHeight - 80) / matchesInRound;
          const cardTop = (spacing - MATCH_HEIGHT) / 2;

          return (
            <div
              key={round}
              className="relative flex flex-col"
              style={{ width: ROUND_WIDTH }}
            >
              {/* Round header */}
              <div className="text-center mb-4 px-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                    round === currentRound
                      ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
                      : "text-white/40"
                  }`}
                >
                  {getRoundLabel(round)}
                </span>
              </div>

              {/* Match cards */}
              {roundMatches.map((match, mi) => {
                const topOffset = 40 + mi * spacing + cardTop;
                const isMyMatch = myMatches.has(match.id);
                const isActive =
                  match.status === MatchStatus.SLOT_SELECTION ||
                  match.status === MatchStatus.ACTIVE;

                return (
                  <div
                    key={match.id}
                    className="absolute"
                    style={{ top: topOffset, left: 16, right: 16 }}
                  >
                    <MatchCard
                      match={match}
                      participants={participants}
                      onClick={isActive && onMatchClick ? () => onMatchClick(match) : undefined}
                      highlight={isMyMatch && isActive}
                    />
                  </div>
                );
              })}

              {/* Connector lines to next round */}
              {round < totalRounds &&
                roundMatches.map((match, mi) => {
                  const nextRoundMatches = matchesByRound[round + 1] ?? [];
                  const nextMatchIdx = Math.floor(mi / 2);
                  const nextMatch = nextRoundMatches[nextMatchIdx];
                  if (!nextMatch) return null;

                  const nextSpacing = (bracketHeight - 80) / nextRoundMatches.length;
                  const nextCardTop = (nextSpacing - MATCH_HEIGHT) / 2;

                  const fromMidY = 40 + mi * spacing + cardTop + MATCH_HEIGHT / 2;
                  const toMidY = 40 + nextMatchIdx * nextSpacing + nextCardTop + MATCH_HEIGHT / 2;

                  return (
                    <svg
                      key={`conn-${match.id}`}
                      className="absolute pointer-events-none"
                      style={{ top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}
                    >
                      <path
                        d={`M ${ROUND_WIDTH - 16} ${fromMidY} H ${ROUND_WIDTH - 4} V ${toMidY} H ${ROUND_WIDTH + 12}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  );
                })}
            </div>
          );
        })}

        {/* Champion label */}
        {totalRounds > 0 && (
          <div
            className="flex items-center pl-4"
            style={{ width: 100 }}
          >
            {tournament.status === "COMPLETED" ? (
              <div className="text-center">
                <div className="text-yellow-400 text-2xl mb-1">🏆</div>
                <div className="text-xs text-yellow-300 font-semibold uppercase tracking-wider">
                  Champion
                </div>
                {(() => {
                  const winner = participants.find((p) => p.finalPosition === 1);
                  return winner ? (
                    <div className="text-sm text-white mt-1">{winner.displayName}</div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="text-xs text-white/30 uppercase tracking-wider">Champion</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
