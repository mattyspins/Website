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
  slot, isWinner, isLoser, onClick, selected, disabled,
}: {
  slot: SlotWorldCupSlot | null;
  isWinner?: boolean;
  isLoser?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
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
      {isWinner && <span className="text-green-400 text-xs shrink-0">✓</span>}
    </Wrapper>
  );
}

interface Props {
  tournament: SlotWorldCup;
  mode: "view" | "predict";
  picks?: Record<string, string>;
  onPick?: (key: string, slotId: string) => void;
  userPrediction?: Record<string, string> | null; // a submitted prediction, overlaid for correctness once results are known
}

export default function SlotWorldCupBracket({ tournament, mode, picks, onPick, userPrediction }: Props) {
  const slotsById = new Map(tournament.slots.map((s) => [s.id, s]));
  const rounds: SlotWorldCupMatch[][] = [];
  for (let r = 1; r <= tournament.totalRounds; r++) {
    rounds.push(tournament.matches.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber));
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

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.map((matches, ri) => (
          <div key={ri} className="flex flex-col justify-around gap-4 min-w-[220px]">
            <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-400/70 text-center mb-1">
              {roundLabel(ri + 1, tournament.totalRounds)}
            </p>
            {matches.map((match) => {
              const key = matchKey(match.round, match.matchNumber);
              const isBye = !!match.winnerId && (!match.slotAId || !match.slotBId);

              if (mode === "view") {
                const slotA = match.slotAId ? slotsById.get(match.slotAId) ?? null : null;
                const slotB = match.slotBId ? slotsById.get(match.slotBId) ?? null : null;
                return (
                  <div key={match.id} className="bg-white/3 border border-white/8 rounded-xl p-2.5 space-y-1.5">
                    <SlotChip slot={slotA} isWinner={!!match.winnerId && match.winnerId === match.slotAId} isLoser={!!match.winnerId && match.winnerId !== match.slotAId && !!slotA} />
                    {!isBye && <SlotChip slot={slotB} isWinner={!!match.winnerId && match.winnerId === match.slotBId} isLoser={!!match.winnerId && match.winnerId !== match.slotBId && !!slotB} />}
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
            })}
          </div>
        ))}
        {tournament.championSlotId && (
          <div className="flex flex-col justify-center min-w-[220px]">
            <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-400/70 text-center mb-1">Champion 👑</p>
            <SlotChip slot={slotsById.get(tournament.championSlotId) ?? null} isWinner />
          </div>
        )}
      </div>
    </div>
  );
}
