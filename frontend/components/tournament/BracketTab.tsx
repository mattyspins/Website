"use client";

import { Tournament } from "@/types/tournament";
import TournamentBracket from "@/components/TournamentBracket";

export default function BracketTab({ tournament, myParticipantId }: { tournament: Tournament; myParticipantId?: string }) {
  if (tournament.matches.length === 0) {
    return <p className="text-white/40 text-sm">The bracket hasn&apos;t been drawn yet.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
        <div className="tt-display text-xl text-white">TOURNAMENT BRACKET</div>
        {tournament.drawSeed && (
          <div className="text-[11px] text-white/55 bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] px-2.5 py-1.5 rounded">
            Draw seed: <span className="text-white/75 font-mono">{tournament.drawSeed.slice(0, 8)}...{tournament.drawSeed.slice(-4)}</span> — published pre-draw, verifiable
          </div>
        )}
      </div>
      <TournamentBracket tournament={tournament} myParticipantId={myParticipantId} />
    </div>
  );
}
