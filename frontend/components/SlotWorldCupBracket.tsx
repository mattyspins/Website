"use client";

import { SlotWorldCup, SlotWorldCupMatch, SlotWorldCupSlot } from "@/types/slotWorldCup";
import { findSlot } from "@/lib/slotGames";
import { SlotImage } from "@/components/SlotPicker";

function roundLabel(round: number, totalRounds: number): string {
  const distance = totalRounds - round;
  if (distance === 0) return "Final";
  if (distance === 1) return "Semi Final";
  if (distance === 2) return "Quarter Final";
  return `Round ${round}`;
}

function matchKey(round: number, matchNumber: number) {
  return `${round}:${matchNumber}`;
}

function SlotChip({
  slot, isWinner, isLoser, onClick, selected, disabled, multiplier,
}: {
  slot: SlotWorldCupSlot | null;
  isWinner?: boolean;
  isLoser?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  multiplier?: string | null;
}) {
  if (!slot) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5 text-white/25 text-sm italic">
        TBD
      </div>
    );
  }
  const game = findSlot(slot.slotName);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
        selected
          ? "bg-yellow-400/15 border-yellow-400/50"
          : isWinner
          ? "bg-green-500/10 border-green-500/30"
          : isLoser
          ? "bg-white/3 border-white/5 opacity-40"
          : onClick
          ? "bg-white/5 border-white/10 hover:border-yellow-400/40 hover:bg-white/8"
          : "bg-white/5 border-white/10"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {game?.image ? (
        <SlotImage src={game.image} name={slot.slotName} size={28} />
      ) : (
        <div className="w-7 h-7 rounded bg-white/10 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{slot.slotName}</p>
        <p className="text-[11px] text-white/40 truncate">{game?.provider ?? slot.provider ?? "—"} · Seed {slot.seed}</p>
      </div>
      {multiplier && (
        <span className={`text-xs font-bold shrink-0 ${isWinner ? "text-green-400" : "text-white/40"}`}>
          {Number(multiplier).toFixed(2)}x
        </span>
      )}
      {isWinner && <span className="text-green-400 text-xs shrink-0">✓</span>}
    </Wrapper>
  );
}

export interface MatchResultDraft {
  betA: string;
  payoutA: string;
  betB: string;
  payoutB: string;
}

interface Props {
  tournament: SlotWorldCup;
  /** admin adds the inline bet/payout editor to each live matchup. */
  mode: "view" | "predict" | "admin";
  picks?: Record<string, string>;
  onPick?: (key: string, slotId: string) => void;
  userPrediction?: Record<string, string> | null; // a submitted prediction, overlaid for correctness once results are known
  // ─── admin mode ───
  matchResults?: Record<string, MatchResultDraft>;
  onResultChange?: (matchId: string, field: keyof MatchResultDraft, value: string) => void;
  onSubmitResult?: (matchId: string) => void;
  actionLoading?: boolean;
}

// Fixed geometry, mirroring TournamentBracket: every match is absolutely placed
// from a computed centre, which is what keeps rounds aligned no matter how many
// matches each one holds. Admin cards are taller because of the bet/payout row.
const ROUND_WIDTH = 268;
const CHAMPION_WIDTH = 170;
const TOP_OFFSET = 46;
const BOTTOM_PAD = 24;

export default function SlotWorldCupBracket({
  tournament, mode, picks, onPick, userPrediction,
  matchResults, onResultChange, onSubmitResult, actionLoading,
}: Props) {
  // Default both: a tournament read from the list endpoint carries neither, and
  // rendering one of those must degrade to an empty bracket rather than throw.
  const allSlots = tournament.slots ?? [];
  const allMatches = tournament.matches ?? [];
  const slotsById = new Map(allSlots.map((s) => [s.id, s]));
  const rounds: SlotWorldCupMatch[][] = [];
  for (let r = 1; r <= tournament.totalRounds; r++) {
    rounds.push(allMatches.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber));
  }

  const localPicks = picks ?? {};

  // In predict mode, round-1 candidates are the real bracket entrants; later
  // rounds are whatever the user has picked so far for their own bracket path.
  const candidatesFor = (match: SlotWorldCupMatch): (string | null)[] => {
    if (match.round === 1) {
      if (match.winnerId && (!match.slotAId || !match.slotBId)) return [match.winnerId];
      return [match.slotAId, match.slotBId];
    }
    const prevA = localPicks[matchKey(match.round - 1, match.matchNumber * 2)] ?? null;
    const prevB = localPicks[matchKey(match.round - 1, match.matchNumber * 2 + 1)] ?? null;
    return [prevA, prevB];
  };

  const renderMatch = (match: SlotWorldCupMatch) => {
              const key = matchKey(match.round, match.matchNumber);

              if (mode === "admin") {
                const slotA = match.slotAId ? slotsById.get(match.slotAId) ?? null : null;
                const slotB = match.slotBId ? slotsById.get(match.slotBId) ?? null : null;
                const bye = !!match.winnerId && (!match.slotAId || !match.slotBId);
                const done = !!match.winnerId;
                const ready = !!match.slotAId && !!match.slotBId && !done;
                const d = matchResults?.[match.id] ?? { betA: "", payoutA: "", betB: "", payoutB: "" };
                // Shown live as the admin types, so the winning side is obvious
                // before submitting — the server derives the same number.
                const mult = (bet: string, payout: string) =>
                  Number(bet) > 0 && payout !== "" ? Number(payout) / Number(bet) : null;
                const mA = done ? (match.multiplierA == null ? null : Number(match.multiplierA)) : mult(d.betA, d.payoutA);
                const mB = done ? (match.multiplierB == null ? null : Number(match.multiplierB)) : mult(d.betB, d.payoutB);

                const side = (
                  slot: SlotWorldCupSlot | null,
                  isWinner: boolean,
                  m: number | null,
                  betField: keyof MatchResultDraft,
                  payoutField: keyof MatchResultDraft,
                ) => (
                  <div className="space-y-1">
                    <SlotChip slot={slot} isWinner={isWinner} isLoser={done && !isWinner && !!slot} />
                    {ready && (
                      <div className="flex gap-1 items-center">
                        <input
                          type="number" min="0" placeholder="Bet" value={d[betField]}
                          onChange={(e) => onResultChange?.(match.id, betField, e.target.value)}
                          aria-label={`${slot?.slotName ?? "Slot"} bet`}
                          className="w-full min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
                        />
                        <input
                          type="number" min="0" placeholder="Payout" value={d[payoutField]}
                          onChange={(e) => onResultChange?.(match.id, payoutField, e.target.value)}
                          aria-label={`${slot?.slotName ?? "Slot"} payout`}
                          className="w-full min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
                        />
                      </div>
                    )}
                    {m != null && !isNaN(m) && (
                      <p className={`text-[11px] font-bold text-center ${isWinner ? "text-green-400" : "text-yellow-400/80"}`}>
                        {m.toFixed(2)}x
                      </p>
                    )}
                  </div>
                );

                return (
                  <div className={`bg-white/3 border rounded-xl p-2 space-y-1.5 ${ready ? "border-yellow-400/25" : "border-white/8"}`}>
                    {side(slotA, done && match.winnerId === match.slotAId, mA, "betA", "payoutA")}
                    {bye ? (
                      <p className="text-[10px] text-white/25 text-center">BYE — advances automatically</p>
                    ) : (
                      side(slotB, done && match.winnerId === match.slotBId, mB, "betB", "payoutB")
                    )}
                    {ready && (
                      <button
                        onClick={() => onSubmitResult?.(match.id)}
                        disabled={actionLoading}
                        className="w-full py-1 bg-yellow-400 text-black font-semibold rounded text-[11px] hover:bg-yellow-300 disabled:opacity-40"
                      >
                        Submit Result
                      </button>
                    )}
                    {!ready && !done && (
                      <p className="text-[10px] text-white/25 text-center">Waiting on the previous round</p>
                    )}
                  </div>
                );
              }
              const isBye = !!match.winnerId && (!match.slotAId || !match.slotBId);

              if (mode === "view") {
                const slotA = match.slotAId ? slotsById.get(match.slotAId) ?? null : null;
                const slotB = match.slotBId ? slotsById.get(match.slotBId) ?? null : null;
                return (
                  <div key={match.id} className="bg-white/3 border border-white/8 rounded-xl p-2.5 space-y-1.5">
                    <SlotChip
                      slot={slotA}
                      isWinner={!!match.winnerId && match.winnerId === match.slotAId}
                      isLoser={!!match.winnerId && match.winnerId !== match.slotAId && !!slotA}
                      multiplier={match.multiplierA}
                    />
                    {!isBye && (
                      <SlotChip
                        slot={slotB}
                        isWinner={!!match.winnerId && match.winnerId === match.slotBId}
                        isLoser={!!match.winnerId && match.winnerId !== match.slotBId && !!slotB}
                        multiplier={match.multiplierB}
                      />
                    )}
                    {isBye && <p className="text-[10px] text-white/25 text-center">BYE — advances automatically</p>}
                  </div>
                );
              }

              // predict mode
              const [candA, candB] = candidatesFor(match);
              const slotA = candA ? slotsById.get(candA) ?? null : null;
              const slotB = candB ? slotsById.get(candB) ?? null : null;
              const forced = isBye || (!!candA && !candB);
              const myPick = localPicks[key];
              const submittedPick = userPrediction?.[key];
              const resolved = !!match.winnerId;

              const chipProps = (slotId: string | null, slot: SlotWorldCupSlot | null) => {
                if (!slot || !slotId) return { slot: null as SlotWorldCupSlot | null };
                const selected = myPick === slotId;
                const showResult = resolved && submittedPick === slotId;
                return {
                  slot,
                  selected,
                  isWinner: showResult && match.winnerId === slotId,
                  isLoser: showResult && match.winnerId !== slotId,
                  disabled: forced || resolved,
                  onClick: forced || resolved || !onPick ? undefined : () => onPick(key, slotId),
                };
              };

              return (
                <div key={match.id} className="bg-white/3 border border-white/8 rounded-xl p-2.5 space-y-1.5">
                  <SlotChip {...chipProps(candA, slotA)} />
                  {!forced && <SlotChip {...chipProps(candB, slotB)} />}
                  {forced && slotA && <p className="text-[10px] text-white/25 text-center">BYE — advances automatically</p>}
                  {!forced && !slotA && !slotB && (
                    <p className="text-[10px] text-white/25 text-center py-1">Pick the previous round first</p>
                  )}
                </div>
              );
  };

  // Card height drives the whole layout, so it has to reflect what's actually
  // rendered: the admin editor adds a bet/payout row and a submit button.
  const matchHeight = mode === "admin" ? 208 : 104;
  const firstRoundCount = rounds[0]?.length ?? 1;
  const bracketHeight =
    TOP_OFFSET + BOTTOM_PAD + firstRoundCount * (matchHeight + (mode === "admin" ? 20 : 28));

  const champion = tournament.championSlotId
    ? slotsById.get(tournament.championSlotId) ?? null
    : null;

  return (
    <div className="overflow-x-auto pb-6">
      <div
        className="relative flex gap-0"
        style={{ minWidth: rounds.length * ROUND_WIDTH + CHAMPION_WIDTH, height: bracketHeight }}
      >
        {rounds.map((matches, ri) => {
          const round = ri + 1;
          const count = matches.length || 1;
          // Each round splits the same vertical space into `count` equal bands and
          // centres its card in each — so a round-N card always lands exactly
          // midway between the two round-(N-1) cards that feed it.
          const spacing = (bracketHeight - TOP_OFFSET - BOTTOM_PAD) / count;
          const cardOffset = (spacing - matchHeight) / 2;

          return (
            <div key={round} className="relative" style={{ width: ROUND_WIDTH }}>
              <div className="absolute top-0 left-0 right-0 flex justify-center">
                <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 text-yellow-400/80 border border-yellow-400/20">
                  {roundLabel(round, tournament.totalRounds)}
                </span>
              </div>

              {matches.map((match, mi) => (
                <div
                  key={match.id}
                  className="absolute"
                  style={{ top: TOP_OFFSET + mi * spacing + cardOffset, left: 14, right: 26 }}
                >
                  {renderMatch(match)}
                </div>
              ))}

              {/* Elbow connectors into the next round (or into the champion column
                  from the final). Solid gold once the match has a winner. */}
              {matches.map((match, mi) => {
                const isFinal = round === rounds.length;
                const nextCount = isFinal ? 1 : (rounds[ri + 1]?.length || 1);
                const nextIdx = isFinal ? 0 : Math.floor(mi / 2);
                const nextSpacing = (bracketHeight - TOP_OFFSET - BOTTOM_PAD) / nextCount;
                const nextCardOffset = (nextSpacing - matchHeight) / 2;
                const fromY = TOP_OFFSET + mi * spacing + cardOffset + matchHeight / 2;
                const toY = isFinal
                  ? bracketHeight / 2
                  : TOP_OFFSET + nextIdx * nextSpacing + nextCardOffset + matchHeight / 2;
                const decided = !!match.winnerId;
                return (
                  <svg
                    key={`c-${match.id}`}
                    aria-hidden
                    className="absolute pointer-events-none"
                    style={{ top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}
                  >
                    <path
                      d={`M ${ROUND_WIDTH - 26} ${fromY} H ${ROUND_WIDTH - 13} V ${toY} H ${ROUND_WIDTH + 14}`}
                      fill="none"
                      stroke={decided ? "rgba(250,204,21,0.4)" : "rgba(255,255,255,0.10)"}
                      strokeWidth={decided ? 2 : 1.5}
                      strokeDasharray={decided ? "none" : "4 3"}
                    />
                  </svg>
                );
              })}
            </div>
          );
        })}

        {/* Champion column */}
        <div className="flex items-center justify-center" style={{ width: CHAMPION_WIDTH }}>
          {champion ? (
            <div className="text-center px-3">
              <div className="text-4xl mb-2 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">🏆</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-1.5">
                Champion
              </div>
              <div className="mx-auto mb-1.5 w-12 h-12">
                {findSlot(champion.slotName)?.image ? (
                  <SlotImage src={findSlot(champion.slotName)!.image} name={champion.slotName} size={48} />
                ) : (
                  <div className="w-12 h-12 rounded bg-yellow-400/20 ring-2 ring-yellow-400/50" />
                )}
              </div>
              <p className="text-sm font-bold text-yellow-300 leading-tight">{champion.slotName}</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                {findSlot(champion.slotName)?.provider ?? champion.provider ?? "—"}
              </p>
            </div>
          ) : (
            <div className="text-center px-3 opacity-40">
              <div className="text-4xl mb-2 grayscale">🏆</div>
              <div className="text-[10px] uppercase tracking-widest text-white/25">Champion</div>
              <p className="text-[11px] text-white/20 mt-1">To be decided</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
