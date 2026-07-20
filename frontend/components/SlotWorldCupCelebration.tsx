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
    <div className="relative overflow-hidden rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-yellow-400/10 via-yellow-400/[0.03] to-transparent px-6 py-10 text-center">
      <SlotWorldCupFireworks height={240} />
      <div className="relative">
        <div className="text-6xl mb-3 drop-shadow-[0_0_22px_rgba(250,204,21,0.55)]">🏆</div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400 mb-2">
          Tournament Complete
        </p>
        <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">{title}</h3>
        {champion && (
          <div className="inline-flex items-center gap-3 bg-white/5 border border-yellow-400/20 rounded-xl px-4 py-2.5">
            {game?.image ? (
              <SlotImage src={game.image} name={champion.slotName} size={40} />
            ) : (
              <div className="w-10 h-10 rounded bg-yellow-400/20" />
            )}
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Champion</p>
              <p className="text-yellow-300 font-bold leading-tight">{champion.slotName}</p>
            </div>
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
