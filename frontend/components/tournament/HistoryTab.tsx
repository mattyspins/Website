"use client";

import { Tournament, TournamentStatus } from "@/types/tournament";

export default function HistoryTab({ tournaments }: { tournaments: Tournament[] }) {
  const past = tournaments
    .filter((t) => t.status === TournamentStatus.COMPLETED || t.status === TournamentStatus.CANCELLED)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (past.length === 0) {
    return <p className="text-white/40 text-sm">No past tournaments yet.</p>;
  }

  return (
    <div>
      <div className="tt-display text-xl text-white mb-3">PAST TOURNAMENTS</div>
      <div className="flex flex-col gap-2.5">
        {past.map((t) => {
          const champ = t.participants.find((p) => p.finalPosition === 1);
          return (
            <div key={t.id} className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded px-4 py-3.5 flex items-center justify-between flex-wrap gap-2.5">
              <div>
                <div className="font-extrabold text-[14px] text-white">{t.title}</div>
                <div className="text-xs text-white/55">
                  {new Date(t.updatedAt).toLocaleDateString()} · {t.maxPlayers} players
                  {t.status === TournamentStatus.CANCELLED && <span className="ml-2 text-red-400">Cancelled</span>}
                </div>
              </div>
              {champ && (
                <div className="text-right">
                  <div className="text-[11px] text-white/50 uppercase tracking-wide">Champion</div>
                  <div className="tt-display text-lg text-[color:var(--tt-gold)]">{champ.displayName}</div>
                  <div className="text-[11px] text-white/50">{champ.currentSlot ?? "—"}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
