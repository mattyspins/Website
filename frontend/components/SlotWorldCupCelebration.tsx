"use client";

import { SlotWorldCupSlot } from "@/types/slotWorldCup";
import { findSlot } from "@/lib/slotGames";
import { SlotImage } from "@/components/SlotPicker";
import SlotWorldCupFireworks from "@/components/SlotWorldCupFireworks";

/**
 * The banner shown once a tournament is COMPLETED — champion art, fireworks
 * behind it, and whatever the caller wants underneath (a leaderboard, an admin
 * "start new tournament" action, …). Shared between the public and admin pages
 * so the two don't drift into two different-looking celebrations.
 */
export default function SlotWorldCupCelebration({
  title,
  champion,
  children,
}: {
  title: string;
  champion: SlotWorldCupSlot | null;
  children?: React.ReactNode;
}) {
  const game = champion ? findSlot(champion.slotName) : null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--tt-gold-border)] bg-gradient-to-b from-[color:var(--tt-gold)]/10 via-[color:var(--tt-gold)]/[0.03] to-transparent px-6 py-10 text-center">
      <SlotWorldCupFireworks height={240} />
      <div className="relative">
        <div className="text-6xl mb-3 drop-shadow-[0_0_22px_var(--tt-gold-border)]">🏆</div>
        <p className="tt-display text-xs tracking-[0.25em] text-[color:var(--tt-gold)] mb-2">
          Tournament Complete
        </p>
        <h3 className="tt-display text-2xl sm:text-3xl text-white mb-3">{title}</h3>
        {champion && (
          <div className="inline-flex items-center gap-3 bg-white/5 border border-[color:var(--tt-gold-border)] rounded-xl px-4 py-2.5">
            {game?.image ? (
              <SlotImage src={game.image} name={champion.slotName} size={40} />
            ) : (
              <div className="w-10 h-10 rounded bg-[color:var(--tt-gold)]/20" />
            )}
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Champion</p>
              <p className="text-[color:var(--tt-gold)] font-bold leading-tight">{champion.slotName}</p>
            </div>
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
