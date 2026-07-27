"use client";

import { Tournament } from "@/types/tournament";
import { findSlot } from "@/lib/slotGames";
import { SlotImage } from "@/components/SlotPicker";

export default function PlayersReservesTab({ tournament }: { tournament: Tournament }) {
  return (
    <div>
      <div className="tt-display text-xl text-white mb-3">
        SELECTED PARTICIPANTS <span className="text-white/45 text-sm">— drawn live, seed verifiable</span>
      </div>
      {tournament.participants.length === 0 ? (
        <p className="text-white/40 text-sm mb-8">No participants yet — the draw hasn&apos;t run.</p>
      ) : (
        <div className="grid gap-2.5 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {tournament.participants.map((p) => {
            const game = p.currentSlot ? findSlot(p.currentSlot) : null;
            return (
              <div key={p.id} className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded p-3 flex gap-2.5 items-center">
                {game ? (
                  <SlotImage src={game.image} name={game.name} size={38} />
                ) : (
                  <div className="w-[38px] h-[38px] rounded-lg bg-white/10 flex items-center justify-center text-white/60 font-bold shrink-0">
                    {p.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-extrabold text-[13px] truncate text-white">{p.displayName}</div>
                  <div className="text-[11px] text-white/60 truncate">{p.currentSlot ?? "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="tt-display text-xl text-white mb-3">
        RESERVES <span className="text-white/45 text-sm">— fill in this order if a spot opens</span>
      </div>
      {tournament.reserves.length === 0 ? (
        <p className="text-white/40 text-sm">No reserves.</p>
      ) : (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {tournament.reserves.map((r) => (
            <div key={r.entryId} className="bg-[color:var(--tt-bg-sunken)] border border-dashed border-[color:var(--tt-border-soft)] rounded p-3 flex gap-2.5 items-center">
              <div className="tt-display text-base text-white/40 w-[22px] shrink-0">{r.rank}</div>
              <div className="min-w-0">
                <div className="font-extrabold text-[13px] truncate text-white">{r.displayName}</div>
                <div className="text-[11px] text-white/50 truncate">{r.slot ?? "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
