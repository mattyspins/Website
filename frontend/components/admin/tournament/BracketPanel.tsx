"use client";

import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, TournamentMatch, TournamentStatus } from "@/types/tournament";
import TournamentBracket from "@/components/TournamentBracket";

type ConfirmFn = (opts: { title: string; message: string; confirmText?: string; confirmColor?: "red" | "yellow" | "green" }) => Promise<boolean>;

interface Props {
  tournament: Tournament;
  actionLoading: boolean;
  withAction: (fn: () => Promise<Tournament>) => Promise<Tournament>;
  onMatchUpdate: (match: TournamentMatch) => void;
  confirm: ConfirmFn;
  onError: (msg: string) => void;
}

export default function BracketPanel({ tournament, actionLoading, withAction, onMatchUpdate, confirm, onError }: Props) {
  if (tournament.matches.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="tt-display text-2xl text-white">Bracket &amp; Matches</h2>
        <p className="text-white/40 text-sm">No bracket yet — run the draw first.</p>
      </div>
    );
  }

  const handleDeclareWinner = (matchId: string, winnerId: string) =>
    withAction(() => tournamentApi.declareMatchWinner(matchId, winnerId)).catch(() => {});

  const handleRevertWinner = async (matchId: string) => {
    if (!(await confirm({ title: "Revert this result?", message: "The match will go back to Active and the loser will be restored.", confirmText: "Revert", confirmColor: "yellow" }))) return;
    withAction(() => tournamentApi.revertMatchWinner(matchId)).catch(() => {});
  };

  const handleSetMatchResult = (matchId: string, participantId: string, resultText: string) => {
    tournamentApi.setMatchResult(matchId, participantId, resultText).then(onMatchUpdate).catch(() => onError("Failed to save result"));
  };

  const handlePause = (matchId: string) => tournamentApi.pauseMatch(matchId).then(onMatchUpdate).catch(() => onError("Failed to pause match"));
  const handleResume = (matchId: string) => tournamentApi.resumeMatch(matchId).then(onMatchUpdate).catch(() => onError("Failed to resume match"));

  return (
    <div className="space-y-4">
      <h2 className="tt-display text-2xl text-white">Bracket &amp; Matches</h2>
      <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-5">
        <TournamentBracket
          tournament={tournament}
          isAdmin
          onDeclareWinner={handleDeclareWinner}
          onRevertWinner={handleRevertWinner}
          onSetMatchResult={handleSetMatchResult}
          onPauseMatch={handlePause}
          onResumeMatch={handleResume}
          actionLoading={actionLoading}
        />
      </div>

      {tournament.status === TournamentStatus.COMPLETED && (() => {
        const champ = tournament.participants.find((p) => p.finalPosition === 1);
        return (
          <div className="relative overflow-hidden bg-gradient-to-br from-[color:var(--tt-gold-soft)] via-[color:var(--tt-gold-soft)]/40 to-transparent border border-[color:var(--tt-gold-border)] rounded-2xl p-8 text-center">
            <div className="text-6xl mb-3 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">🏆</div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[color:var(--tt-gold)]/70 mb-1">Tournament Complete</p>
            {champ && (
              <div className="mt-3 flex flex-col items-center gap-2">
                {champ.avatarUrl && (
                  <img src={champ.avatarUrl} alt="" className="w-14 h-14 rounded-full ring-2 ring-[color:var(--tt-gold-border)] shadow-[0_0_16px_rgba(250,204,21,0.3)]" />
                )}
                <p className="text-white font-bold text-xl">{champ.displayName}</p>
                {champ.currentSlot && <p className="text-white/50 text-sm italic">{champ.currentSlot}</p>}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
