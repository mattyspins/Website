"use client";

import { useEffect, useState } from "react";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, TournamentStatus } from "@/types/tournament";

const LIFECYCLE: { status: TournamentStatus; label: string }[] = [
  { status: TournamentStatus.DRAFT, label: "Draft" },
  { status: TournamentStatus.REGISTRATION, label: "Registration Open" },
  { status: TournamentStatus.LOCKED, label: "Locked" },
  { status: TournamentStatus.DRAWN, label: "Draw Complete" },
  { status: TournamentStatus.IN_PROGRESS, label: "Live" },
  { status: TournamentStatus.COMPLETED, label: "Complete" },
];

interface Props {
  tournament: Tournament;
  actionLoading: boolean;
  withAction: (fn: () => Promise<Tournament>) => Promise<Tournament>;
  onToast: (title: string, message?: string) => void;
  onError: (msg: string) => void;
}

export default function SetupPanel({ tournament, actionLoading, withAction, onToast, onError }: Props) {
  const [form, setForm] = useState({
    title: tournament.title,
    keyword: tournament.keyword,
    maxPlayers: tournament.maxPlayers,
    allowDuplicateSlots: tournament.allowDuplicateSlots,
    betAmountPerSpin: tournament.betAmountPerSpin ?? "",
    prizePoolDisplay: tournament.prizePoolDisplay ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: tournament.title,
      keyword: tournament.keyword,
      maxPlayers: tournament.maxPlayers,
      allowDuplicateSlots: tournament.allowDuplicateSlots,
      betAmountPerSpin: tournament.betAmountPerSpin ?? "",
      prizePoolDisplay: tournament.prizePoolDisplay ?? "",
    });
  }, [tournament.id, tournament.updatedAt]);

  const slotConfigLocked = tournament.status !== TournamentStatus.DRAFT && tournament.status !== TournamentStatus.REGISTRATION;
  const currentStageIdx = LIFECYCLE.findIndex((s) => s.status === tournament.status);

  const saveDetails = async () => {
    setSaving(true);
    onError("");
    try {
      await withAction(() => tournamentApi.updateTournament(tournament.id, {
        title: form.title,
        keyword: form.keyword,
        maxPlayers: form.maxPlayers,
        allowDuplicateSlots: form.allowDuplicateSlots,
        betAmountPerSpin: form.betAmountPerSpin === "" ? null : Number(form.betAmountPerSpin),
        prizePoolDisplay: form.prizePoolDisplay || null,
      }));
      onToast("Setup saved", "");
    } catch {
      /* error already surfaced via onError inside withAction */
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[color:var(--tt-gold-border)]";
  const labelCls = "block text-[11px] font-bold uppercase tracking-wide text-white/50 mt-3.5 mb-1.5";

  const handleOpenRegistration = () => withAction(() => tournamentApi.openRegistration(tournament.id)).catch(() => {});
  const handleLock = () => withAction(() => tournamentApi.lockRegistration(tournament.id)).catch(() => {});
  const handleStart = () => withAction(() => tournamentApi.startTournament(tournament.id)).catch(() => {});

  return (
    <div className="space-y-5">
      <h2 className="tt-display text-2xl text-white">Tournament Setup</h2>

      {/* Lifecycle stepper */}
      <div className="flex gap-2 flex-wrap">
        {LIFECYCLE.map((s, i) => (
          <div
            key={s.status}
            className={`px-3.5 py-2 rounded-lg text-[11px] font-bold tracking-wide border ${
              i <= currentStageIdx
                ? "bg-[color:var(--tt-gold-soft)] text-[color:var(--tt-gold)] border-[color:var(--tt-gold-border)]"
                : "bg-white/5 text-white/40 border-white/10"
            }`}
          >
            {s.label}
          </div>
        ))}
        {tournament.status === TournamentStatus.CANCELLED && (
          <div className="px-3.5 py-2 rounded-lg text-[11px] font-bold tracking-wide border bg-red-500/10 text-red-400 border-red-500/30">
            Cancelled
          </div>
        )}
      </div>

      {/* Lifecycle actions — the actual open/lock/draw/start workflow */}
      <div className="flex gap-2.5 flex-wrap">
        {tournament.status === TournamentStatus.DRAFT && (
          <button
            onClick={handleOpenRegistration}
            disabled={actionLoading}
            className="px-5 py-3 bg-blue-500 text-white font-bold tt-display tracking-wide rounded-lg hover:bg-blue-400 disabled:opacity-40 transition-colors"
          >
            OPEN REGISTRATION
          </button>
        )}
        {tournament.status === TournamentStatus.REGISTRATION && (
          <button
            onClick={handleLock}
            disabled={actionLoading}
            className="px-5 py-3 bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] font-bold tt-display tracking-wide rounded-lg hover:bg-[color:var(--tt-gold-hover)] disabled:opacity-40 transition-colors"
          >
            LOCK REGISTRATION
          </button>
        )}
        {tournament.status === TournamentStatus.LOCKED && (
          <a
            href={`/admin/tournament/draw/${tournament.id}`}
            className="px-5 py-3 border-2 border-[color:var(--tt-pink)] text-[color:var(--tt-pink)] font-bold tt-display tracking-wide rounded-lg hover:bg-[color:var(--tt-pink-soft)] transition-colors inline-flex items-center"
          >
            RUN LIVE DRAW →
          </a>
        )}
        {(tournament.status === TournamentStatus.LOCKED || tournament.status === TournamentStatus.DRAWN) && (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="px-5 py-3 border border-white/20 text-white/80 font-bold tt-display tracking-wide rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            START TOURNAMENT
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Details */}
        <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-5">
          <p className="tt-display text-base text-white">Details</p>

          <label className={labelCls}>Tournament name</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />

          <label className={labelCls}>Entry keyword</label>
          <input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} className={inputCls} />
          <p className="text-[11px] text-white/40 mt-1">e.g. &quot;{form.keyword} Sweet Bonanza&quot; in chat</p>

          <div className="flex items-center justify-between mt-4 p-3 bg-black/20 rounded-lg">
            <span className="text-sm text-white/70">Allow duplicate slots</span>
            <button
              disabled={slotConfigLocked}
              onClick={() => setForm((f) => ({ ...f, allowDuplicateSlots: !f.allowDuplicateSlots }))}
              className={`rounded-full relative transition-colors disabled:opacity-40 ${form.allowDuplicateSlots ? "bg-[color:var(--tt-gold)]" : "bg-white/15"}`}
              style={{ height: 22, width: 40 }}
            >
              <span className="absolute top-0.5 rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: `translateX(${form.allowDuplicateSlots ? 20 : 2}px)` }} />
            </button>
          </div>
        </div>

        {/* Size & prize */}
        <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-5">
          <p className="tt-display text-base text-white">Size &amp; Prize</p>

          <label className={labelCls}>
            Bracket size <span className="text-white/40 normal-case tracking-normal">({tournament.entryCount} registered)</span>
          </label>
          <div className="flex gap-2">
            {[8, 16].map((n) => (
              <button
                key={n}
                onClick={() => setForm({ ...form, maxPlayers: n })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold tt-display tracking-wide border transition-colors ${
                  form.maxPlayers === n
                    ? "bg-[color:var(--tt-gold-soft)] text-[color:var(--tt-gold)] border-[color:var(--tt-gold-border)]"
                    : "bg-transparent text-white/60 border-white/15"
                }`}
              >
                {n} PLAYERS
              </button>
            ))}
          </div>

          <label className={labelCls}>Bet amount per spin</label>
          <input type="number" min={0} step="0.01" placeholder="$2.00" value={form.betAmountPerSpin} onChange={(e) => setForm({ ...form, betAmountPerSpin: e.target.value })} className={inputCls} />

          <label className={labelCls}>Prize pool (display only)</label>
          <input placeholder="$500" value={form.prizePoolDisplay} onChange={(e) => setForm({ ...form, prizePoolDisplay: e.target.value })} className={inputCls} />
        </div>
      </div>

      <button
        onClick={saveDetails}
        disabled={saving || actionLoading}
        className="px-5 py-2.5 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/15 disabled:opacity-40 transition-colors text-sm"
      >
        {saving ? "Saving…" : "Save Setup"}
      </button>
    </div>
  );
}
