"use client";

import { findSlot } from "@/lib/slotGames";
import { SlotImage } from "@/components/SlotPicker";

interface Props {
  slots: string[];
  selected: string;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

export default function EligibleSlotGrid({ slots, selected, onSelect, disabled }: Props) {
  if (slots.length === 0) {
    return <p className="text-white/40 text-sm">No eligible slots have been set for this tournament yet.</p>;
  }

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
      {slots.map((name) => {
        const game = findSlot(name);
        const isSelected = selected === name;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(name)}
            className={`flex flex-col items-center text-center px-1.5 py-2.5 rounded border transition-colors disabled:cursor-not-allowed ${
              isSelected
                ? "bg-[color:var(--tt-gold-soft)] border-[color:var(--tt-gold)]"
                : "bg-[color:var(--tt-bg-elevated)] border-[color:var(--tt-border)] hover:border-[color:var(--tt-border-soft)]"
            }`}
          >
            {game ? (
              <SlotImage src={game.image} name={game.name} size={40} />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/60 font-bold">
                {name[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-xs font-bold mt-1.5 leading-tight text-white/90">{name}</div>
            {game && <div className="text-[10px] text-white/45 leading-tight">{game.provider}</div>}
          </button>
        );
      })}
    </div>
  );
}
