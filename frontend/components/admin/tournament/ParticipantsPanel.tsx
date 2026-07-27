"use client";

import { useState } from "react";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament } from "@/types/tournament";

type ConfirmFn = (opts: { title: string; message: string; confirmText?: string; confirmColor?: "red" | "yellow" | "green" }) => Promise<boolean>;

interface Props {
  tournament: Tournament;
  actionLoading: boolean;
  withAction: (fn: () => Promise<Tournament>) => Promise<Tournament>;
  confirm: ConfirmFn;
  onError: (msg: string) => void;
}

export default function ParticipantsPanel({ tournament, actionLoading, withAction, confirm }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const reserves = tournament.reserves;

  const handleReplace = async (participantId: string, displayName: string) => {
    if (!(await confirm({
      title: `Replace ${displayName} with the next reserve?`,
      message: "This only works before they've played a match. The reserve inherits their seed and bracket slot.",
      confirmText: "Replace",
      confirmColor: "yellow",
    }))) return;
    setBusyId(participantId);
    try {
      await withAction(() => tournamentApi.replaceParticipant(tournament.id, participantId));
    } catch { /* surfaced via onError */ }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <h2 className="tt-display text-2xl text-white">Participants &amp; Reserves</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/50 font-bold mb-2">
            Selected ({tournament.participants.length})
          </p>
          {tournament.participants.length === 0 ? (
            <p className="text-white/40 text-sm">No participants yet — run the draw first.</p>
          ) : (
            <div className="space-y-1.5">
              {tournament.participants.map((p) => {
                const hasPlayed = tournament.matches.some(
                  (m) => m.participants.some((mp) => mp.participantId === p.id) && m.status === "COMPLETED"
                );
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-lg px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.displayName}</p>
                      <p className="text-xs text-white/45 truncate">{p.currentSlot ?? "no slot"}</p>
                    </div>
                    <button
                      onClick={() => handleReplace(p.id, p.displayName)}
                      disabled={actionLoading || busyId === p.id || hasPlayed || reserves.length === 0}
                      title={hasPlayed ? "Already played a match" : reserves.length === 0 ? "No reserves left" : undefined}
                      className="text-[11px] px-2.5 py-1.5 rounded-md border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-30 shrink-0 transition-colors"
                    >
                      Replace w/ reserve
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/50 font-bold mb-2">Reserves (in order)</p>
          {!tournament.drawExecutedAt ? (
            <p className="text-white/40 text-sm">Reserves appear once the draw has run.</p>
          ) : reserves.length === 0 ? (
            <p className="text-white/40 text-sm">No reserves.</p>
          ) : (
            <div className="space-y-1.5">
              {reserves.map((r) => (
                <div key={r.entryId} className="bg-[color:var(--tt-bg-sunken)] border border-dashed border-[color:var(--tt-border-soft)] rounded-lg px-3.5 py-2.5 text-sm">
                  <span className="text-white/40 mr-2">#{r.rank}</span>
                  <span className="text-white/80">{r.displayName}</span>
                  <span className="text-white/45 ml-2">— {r.slot ?? "no slot"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
