"use client";

import { useEffect, useState } from "react";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, TournamentStatus, TournamentScoringMethod } from "@/types/tournament";
import SlotPicker, { SlotImage } from "@/components/SlotPicker";
import { findSlot } from "@/lib/slotGames";

const LIFECYCLE: { status: TournamentStatus; label: string }[] = [
  { status: TournamentStatus.DRAFT, label: "Draft" },
  { status: TournamentStatus.REGISTRATION, label: "Registration Open" },
  { status: TournamentStatus.LOCKED, label: "Locked" },
  { status: TournamentStatus.DRAWN, label: "Draw Complete" },
  { status: TournamentStatus.IN_PROGRESS, label: "Live" },
  { status: TournamentStatus.COMPLETED, label: "Complete" },
];

const SCORING_LABELS: Record<TournamentScoringMethod, string> = {
  [TournamentScoringMethod.TOTAL_MULTIPLIER]: "Total multiplier (bonus buy)",
  [TournamentScoringMethod.HIGHEST_SINGLE_WIN]: "Highest single win",
  [TournamentScoringMethod.FINAL_BALANCE]: "Final balance",
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    registrationOpensAt: toLocalInputValue(tournament.registrationOpensAt),
    registrationClosesAt: toLocalInputValue(tournament.registrationClosesAt),
    allowDuplicateSlots: tournament.allowDuplicateSlots,
    eligibleSlots: tournament.eligibleSlots,
    scoringMethod: tournament.scoringMethod,
    spinsPerMatch: tournament.spinsPerMatch ?? 5,
    betAmountPerSpin: tournament.betAmountPerSpin ?? "",
    prizePoolDisplay: tournament.prizePoolDisplay ?? "",
  });
  const [slotPickerValue, setSlotPickerValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: tournament.title,
      keyword: tournament.keyword,
      maxPlayers: tournament.maxPlayers,
      registrationOpensAt: toLocalInputValue(tournament.registrationOpensAt),
      registrationClosesAt: toLocalInputValue(tournament.registrationClosesAt),
      allowDuplicateSlots: tournament.allowDuplicateSlots,
      eligibleSlots: tournament.eligibleSlots,
      scoringMethod: tournament.scoringMethod,
      spinsPerMatch: tournament.spinsPerMatch ?? 5,
      betAmountPerSpin: tournament.betAmountPerSpin ?? "",
      prizePoolDisplay: tournament.prizePoolDisplay ?? "",
    });
  }, [tournament.id, tournament.updatedAt]);

  const slotConfigLocked = tournament.status !== TournamentStatus.DRAFT && tournament.status !== TournamentStatus.REGISTRATION;
  const currentStageIdx = LIFECYCLE.findIndex((s) => s.status === tournament.status);

  const addSlot = () => {
    const trimmed = slotPickerValue.trim();
    if (!trimmed) return;
    if (!form.eligibleSlots.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setForm((f) => ({ ...f, eligibleSlots: [...f.eligibleSlots, trimmed] }));
    }
    setSlotPickerValue("");
  };
  const removeSlot = (name: string) => setForm((f) => ({ ...f, eligibleSlots: f.eligibleSlots.filter((s) => s !== name) }));

  const saveDetails = async () => {
    setSaving(true);
    onError("");
    try {
      await withAction(() => tournamentApi.updateTournament(tournament.id, {
        title: form.title,
        keyword: form.keyword,
        maxPlayers: form.maxPlayers,
        registrationOpensAt: form.registrationOpensAt ? new Date(form.registrationOpensAt).toISOString() : null,
        registrationClosesAt: form.registrationClosesAt ? new Date(form.registrationClosesAt).toISOString() : null,
        allowDuplicateSlots: form.allowDuplicateSlots,
        eligibleSlots: form.eligibleSlots,
        scoringMethod: form.scoringMethod,
        spinsPerMatch: form.spinsPerMatch,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Details & schedule */}
        <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-5">
          <p className="tt-display text-base text-white">Details &amp; Schedule</p>

          <label className={labelCls}>Tournament name</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />

          <label className={labelCls}>Entry keyword</label>
          <input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} className={inputCls} />
          <p className="text-[11px] text-white/40 mt-1">e.g. &quot;{form.keyword} Sweet Bonanza&quot; in chat</p>

          <label className={labelCls}>Registration opens</label>
          <input type="datetime-local" value={form.registrationOpensAt} onChange={(e) => setForm({ ...form, registrationOpensAt: e.target.value })} className={inputCls} />

          <label className={labelCls}>Registration closes</label>
          <input type="datetime-local" value={form.registrationClosesAt} onChange={(e) => setForm({ ...form, registrationClosesAt: e.target.value })} className={inputCls} />

          <div className="flex items-center justify-between mt-4 p-3 bg-black/20 rounded-lg">
            <span className="text-sm text-white/70">Allow duplicate slots</span>
            <button
              disabled={slotConfigLocked}
              onClick={() => setForm((f) => ({ ...f, allowDuplicateSlots: !f.allowDuplicateSlots }))}
              className={`w-10 h-5.5 rounded-full relative transition-colors disabled:opacity-40 ${form.allowDuplicateSlots ? "bg-[color:var(--tt-gold)]" : "bg-white/15"}`}
              style={{ height: 22, width: 40 }}
            >
              <span className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: `translateX(${form.allowDuplicateSlots ? 20 : 2}px)` }} />
            </button>
          </div>
        </div>

        {/* Size & scoring */}
        <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-5">
          <p className="tt-display text-base text-white">Size &amp; Scoring</p>

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

          <label className={labelCls}>Scoring method</label>
          <select
            value={form.scoringMethod}
            onChange={(e) => setForm({ ...form, scoringMethod: e.target.value as TournamentScoringMethod })}
            className={inputCls}
          >
            {Object.values(TournamentScoringMethod).map((m) => (
              <option key={m} value={m}>{SCORING_LABELS[m]}</option>
            ))}
          </select>

          <label className={labelCls}>Spins per match</label>
          <input type="number" min={1} value={form.spinsPerMatch} onChange={(e) => setForm({ ...form, spinsPerMatch: Number(e.target.value) })} className={inputCls} />

          <label className={labelCls}>Bet amount per spin</label>
          <input type="number" min={0} step="0.01" placeholder="$2.00" value={form.betAmountPerSpin} onChange={(e) => setForm({ ...form, betAmountPerSpin: e.target.value })} className={inputCls} />

          <label className={labelCls}>Prize pool (display only)</label>
          <input placeholder="$500" value={form.prizePoolDisplay} onChange={(e) => setForm({ ...form, prizePoolDisplay: e.target.value })} className={inputCls} />
        </div>
      </div>

      {/* Eligible slots */}
      <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-5">
        <p className="tt-display text-base text-white mb-3">Eligible Slots</p>
        {!slotConfigLocked && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <SlotPicker value={slotPickerValue} onChange={setSlotPickerValue} placeholder="Search a slot to add…" />
            </div>
            <button
              onClick={addSlot}
              disabled={!slotPickerValue.trim()}
              className="px-4 py-2.5 bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] font-semibold rounded-lg hover:bg-[color:var(--tt-gold-hover)] disabled:opacity-40 transition-colors text-sm shrink-0"
            >
              Add
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {form.eligibleSlots.length === 0 && <p className="text-white/40 text-sm">No eligible slots yet — add at least one before locking registration.</p>}
          {form.eligibleSlots.map((name) => {
            const game = findSlot(name);
            return (
              <div key={name} className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg bg-[color:var(--tt-gold-soft)] border border-[color:var(--tt-gold-border)]">
                {game && <SlotImage src={game.image} name={game.name} size={24} />}
                <span className="text-[color:var(--tt-gold)] text-xs font-semibold">{name}</span>
                {!slotConfigLocked && (
                  <button onClick={() => removeSlot(name)} className="text-[color:var(--tt-gold)]/60 hover:text-[color:var(--tt-gold)] text-sm leading-none">×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={saveDetails}
        disabled={saving || actionLoading}
        className="px-5 py-2.5 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/15 disabled:opacity-40 transition-colors text-sm"
      >
        {saving ? "Saving…" : "Save Setup"}
      </button>

      {/* Lifecycle actions */}
      <div className="flex gap-2.5 flex-wrap pt-2 border-t border-white/8">
        {tournament.status === TournamentStatus.DRAFT && (
          <button
            onClick={handleOpenRegistration}
            disabled={actionLoading || !form.registrationClosesAt}
            title={!form.registrationClosesAt ? "Set a registration close time first" : undefined}
            className="px-5 py-3 bg-blue-500 text-white font-bold tt-display tracking-wide rounded-lg hover:bg-blue-400 disabled:opacity-40 transition-colors mt-3"
          >
            OPEN REGISTRATION
          </button>
        )}
        {tournament.status === TournamentStatus.REGISTRATION && (
          <button
            onClick={handleLock}
            disabled={actionLoading || tournament.eligibleSlots.length === 0}
            title={tournament.eligibleSlots.length === 0 ? "Add at least one eligible slot first" : undefined}
            className="px-5 py-3 bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] font-bold tt-display tracking-wide rounded-lg hover:bg-[color:var(--tt-gold-hover)] disabled:opacity-40 transition-colors mt-3"
          >
            LOCK REGISTRATION
          </button>
        )}
        {tournament.status === TournamentStatus.LOCKED && (
          <a
            href={`/admin/tournament/draw/${tournament.id}`}
            className="px-5 py-3 border-2 border-[color:var(--tt-pink)] text-[color:var(--tt-pink)] font-bold tt-display tracking-wide rounded-lg hover:bg-[color:var(--tt-pink-soft)] transition-colors mt-3 inline-flex items-center"
          >
            RUN LIVE DRAW →
          </a>
        )}
        {(tournament.status === TournamentStatus.LOCKED || tournament.status === TournamentStatus.DRAWN) && (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="px-5 py-3 border border-white/20 text-white/80 font-bold tt-display tracking-wide rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors mt-3"
          >
            START TOURNAMENT
          </button>
        )}
      </div>
    </div>
  );
}
