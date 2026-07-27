"use client";

import { useState } from "react";
import { Tournament, TournamentStatus, MyEntryResponse } from "@/types/tournament";
import SlotPicker, { SlotImage } from "@/components/SlotPicker";
import { findSlot } from "@/lib/slotGames";

interface Props {
  tournament: Tournament;
  myEntry: MyEntryResponse | null;
  isLoggedIn: boolean;
  actionLoading: boolean;
  onEnter: (slot: string) => void;
}

export default function RegisterTab({ tournament, myEntry, isLoggedIn, actionLoading, onEnter }: Props) {
  const [slot, setSlot] = useState("");
  const registrationOpen = tournament.status === TournamentStatus.REGISTRATION;
  const selectedGame = findSlot(slot);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-7">
      <div>
        {!registrationOpen ? (
          <p className="text-white/50 text-sm">Registration for this tournament isn&apos;t open right now.</p>
        ) : !isLoggedIn ? (
          <p className="text-white/50 text-sm">Log in with Discord to enter the draw.</p>
        ) : !myEntry?.entered ? (
          <>
            <label className="block text-xs uppercase tracking-wide text-white/50 mb-1.5">Choose your slot</label>
            <div className="mb-3">
              <SlotPicker value={slot} onChange={setSlot} disabled={actionLoading} />
            </div>
            {selectedGame && (
              <div className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)]">
                <SlotImage src={selectedGame.image} name={selectedGame.name} size={44} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{selectedGame.name}</p>
                  <p className="text-xs text-white/50 truncate">{selectedGame.provider}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => onEnter(slot)}
              disabled={!slot || actionLoading}
              className="w-full py-3.5 rounded tt-display text-lg tracking-wide disabled:cursor-not-allowed transition-colors"
              style={{
                background: slot && !actionLoading ? "var(--tt-gold)" : "var(--tt-border-soft)",
                color: slot && !actionLoading ? "var(--tt-gold-text)" : "var(--tt-text-dim)",
              }}
            >
              {actionLoading ? "SUBMITTING…" : "SUBMIT ENTRY"}
            </button>
            <p className="text-[11px] text-white/40 mt-2.5">
              Or type <strong className="text-white/65">{tournament.keyword} &lt;slot name&gt;</strong> in chat — same draw pool, one entry per viewer.
            </p>
          </>
        ) : (
          <div className="bg-[color:var(--tt-gold-soft)] border border-[color:var(--tt-gold-border)] rounded p-5">
            <div className="tt-display text-xl text-[color:var(--tt-gold)]">✓ YOU&apos;RE ENTERED</div>
            <p className="text-white/75 text-sm mt-2">
              You&apos;re registered with <strong className="text-white">{myEntry.slot}</strong>. The draw happens live once
              registration locks — watch this page or the stream.
            </p>
          </div>
        )}
      </div>

      <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded p-5">
        <div className="tt-display text-base text-white mb-2.5">TOURNAMENT RULES</div>
        <ul className="text-[13px] text-white/70 leading-[1.9] pl-4 list-disc space-y-0.5">
          <li>{tournament.maxPlayers} players drawn at random once registration locks.</li>
          <li>Remaining entrants become ordered reserves.</li>
          <li>One slot per player{tournament.allowDuplicateSlots ? "" : " — no duplicates in the bracket"}.</li>
          <li>Each match: bonus-buy spins at the same bet size. Highest total multiplier wins.</li>
          <li>Ties: highest single spin wins; still tied → sudden-death spin.</li>
          <li>Single elimination — lose once, you&apos;re out.</li>
        </ul>
        <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-white/45 leading-relaxed">
          Results are entered manually by the host and verified with screenshots. The random draw uses a published seed
          you can verify yourself — see the Bracket tab after the draw. Play responsibly.
        </div>
      </div>
    </div>
  );
}
