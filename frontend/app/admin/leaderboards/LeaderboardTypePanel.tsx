"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Minus, AlertTriangle } from "lucide-react";
import { useConfirm } from "@/components/admin/useConfirm";
import { londonInputToUtc, utcToLondonInputParts, formatLondon } from "@/lib/londonTime";
import {
  wagerLeaderboardApi,
  ActiveRace,
  RaceHistoryEntry,
  AdminRace,
  RacePrize,
  RaceType,
} from "@/lib/api/wagerLeaderboard";

// Weekly and Monthly get different sensible starting shapes — a shorter cycle
// naturally supports fewer paid positions and a smaller pool — but every
// field is fully editable before saving either way.
const DEFAULTS: Record<RaceType, { prizeAmounts: number[]; days: number }> = {
  MONTHLY: { prizeAmounts: [250, 150, 75, 25], days: 30 },
  WEEKLY: { prizeAmounts: [100, 50, 25], days: 7 },
};

function makeDefaultPrizes(type: RaceType): RacePrize[] {
  return DEFAULTS[type].prizeAmounts.map((amount, i) => ({ position: i + 1, amount }));
}

function defaultScheduleParts(type: RaceType) {
  const now = new Date();
  const end = new Date(now.getTime() + DEFAULTS[type].days * 24 * 60 * 60 * 1000);
  return { start: utcToLondonInputParts(now), end: utcToLondonInputParts(end) };
}

interface Props {
  type: RaceType;
}

export default function LeaderboardTypePanel({ type }: Props) {
  const [activeRace, setActiveRace] = useState<ActiveRace | null>(null);
  const [races, setRaces] = useState<AdminRace[]>([]);
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Create/edit race form state — dates/times are entered as Europe/London wall-clock
  // values and converted to UTC just before hitting the API.
  const [editing, setEditing] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formTotalPool, setFormTotalPool] = useState(String(DEFAULTS[type].prizeAmounts.reduce((s, a) => s + a, 0)));
  const [formPrizes, setFormPrizes] = useState<RacePrize[]>(makeDefaultPrizes(type));

  const load = async () => {
    try {
      const [active, raceList, h] = await Promise.all([
        wagerLeaderboardApi.getActive(type),
        wagerLeaderboardApi.listRaces(type),
        wagerLeaderboardApi.getHistory(type),
      ]);
      setActiveRace(active);
      setRaces(raceList);
      setHistory(h);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [type]);

  const currentActiveMeta = races.find((r) => r.status === "active");

  const startEditing = () => {
    if (currentActiveMeta) {
      const start = utcToLondonInputParts(currentActiveMeta.startDate);
      const end = utcToLondonInputParts(currentActiveMeta.endDate);
      setFormStartDate(start.date);
      setFormStartTime(start.time);
      setFormEndDate(end.date);
      setFormEndTime(end.time);
      setFormTotalPool(String(currentActiveMeta.totalPrizePool));
      setFormPrizes(currentActiveMeta.prizes.length > 0 ? currentActiveMeta.prizes : makeDefaultPrizes(type));
    } else {
      const { start, end } = defaultScheduleParts(type);
      setFormStartDate(start.date);
      setFormStartTime(start.time);
      setFormEndDate(end.date);
      setFormEndTime(end.time);
      setFormTotalPool(String(DEFAULTS[type].prizeAmounts.reduce((s, a) => s + a, 0)));
      setFormPrizes(makeDefaultPrizes(type));
    }
    setMsg(null);
    setEditing(true);
  };

  const addPrizeRow = () => {
    setFormPrizes((prev) => [...prev, { position: prev.length + 1, amount: 10 }]);
  };

  const removePrizeRow = () => {
    setFormPrizes((prev) => prev.slice(0, -1));
  };

  const updatePrizeAmount = (index: number, amount: number) => {
    setFormPrizes((prev) => prev.map((p, i) => (i === index ? { ...p, amount } : p)));
  };

  const handleSaveRace = async () => {
    const totalPrizePool = parseInt(formTotalPool, 10) || 0;
    const prizeSum = formPrizes.reduce((s, p) => s + p.amount, 0);
    if (prizeSum !== totalPrizePool) {
      setMsg({ type: "error", text: `Prize positions sum to $${prizeSum}, which doesn't match the total pool of $${totalPrizePool}.` });
      return;
    }

    setSaving(true); setMsg(null);
    try {
      const startDate = londonInputToUtc(formStartDate, formStartTime).toISOString();
      const endDate = londonInputToUtc(formEndDate, formEndTime).toISOString();

      if (currentActiveMeta) {
        await wagerLeaderboardApi.updateRace(currentActiveMeta.id, {
          startDate,
          endDate,
          totalPrizePool,
          prizes: formPrizes,
        }).then((r: any) => { if (r?.error) throw new Error(r.error); });
        setMsg({ type: "success", text: "Race updated." });
      } else {
        await wagerLeaderboardApi.createRace({ type, startDate, endDate, totalPrizePool, prizes: formPrizes });
        setMsg({ type: "success", text: "Race created." });
      }
      setEditing(false);
      await load();
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message || "Failed to save race." });
    } finally { setSaving(false); }
  };

  const handleDeleteRace = async (raceId: string) => {
    if (!(await confirm({ title: "Delete this race?", message: "This can only be done before it's paid out. This cannot be undone.", confirmText: "Delete" }))) return;
    setMsg(null);
    try {
      await wagerLeaderboardApi.deleteRace(raceId);
      await load();
      setMsg({ type: "success", text: "Race deleted." });
    } catch (err) {
      setMsg({ type: "error", text: (err as Error).message || "Failed to delete race." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const formTotal = formPrizes.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* Race editor / creator */}
        <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-sm">
              {currentActiveMeta ? "Current Race" : "No Active Race"}
            </h2>
            {!editing && (
              <span className="text-gold-400 text-xs font-bold">
                {currentActiveMeta ? `$${currentActiveMeta.totalPrizePool} total` : ""}
              </span>
            )}
          </div>

          {!editing ? (
            <>
              {currentActiveMeta ? (
                <>
                  <p className="text-gray-400 text-xs mb-4">
                    {formatLondon(currentActiveMeta.startDate, "d MMM")}
                    {" – "}
                    {formatLondon(currentActiveMeta.endDate, "d MMM yyyy, HH:mm")}
                    {" · "}{currentActiveMeta.prizes.length} paid position{currentActiveMeta.prizes.length !== 1 ? "s" : ""}
                    {" · "}
                    <span className={
                      currentActiveMeta.phase === "upcoming" ? "text-blue-400" :
                      currentActiveMeta.phase === "active" ? "text-green-400" : "text-gray-400"
                    }>
                      {currentActiveMeta.phase}
                    </span>
                  </p>
                  <div className="space-y-1 mb-4">
                    {currentActiveMeta.prizes.map((p) => (
                      <div key={p.position} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 w-8 shrink-0">#{p.position}</span>
                        <span className="text-white font-semibold">${p.amount}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm mb-4">
                  No race is currently running. Create one to start tracking standings and prizes.
                </p>
              )}
              <button
                onClick={startEditing}
                className="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {currentActiveMeta ? "Edit Race" : "Create New Race"}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-gray-400 text-xs mb-1 block">Total Prize Pool ($)</label>
                <input
                  type="number" min={0} value={formTotalPool} onChange={(e) => setFormTotalPool(e.target.value)}
                  className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                />
              </div>

              <p className="text-gray-400 text-[11px] mb-1.5">Schedule (Europe/London time)</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
                  <input
                    type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Start Time</label>
                  <input
                    type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">End Date</label>
                  <input
                    type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">End Time</label>
                  <input
                    type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs">Prize Positions</label>
                <span className={`text-xs font-bold flex items-center gap-1 ${formTotal === (parseInt(formTotalPool, 10) || 0) ? "text-gold-400" : "text-red-400"}`}>
                  {formTotal !== (parseInt(formTotalPool, 10) || 0) && <AlertTriangle className="w-3 h-3" />}
                  ${formTotal} of ${formTotalPool || 0}
                </span>
              </div>
              <div className="space-y-1.5 mb-3 max-h-60 overflow-y-auto pr-1">
                {formPrizes.map((p, i) => (
                  <div key={p.position} className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs w-10 shrink-0">#{p.position}</span>
                    <span className="text-gray-400 text-xs shrink-0">$</span>
                    <input
                      type="number" min={0}
                      value={p.amount}
                      onChange={(e) => updatePrizeAmount(i, parseInt(e.target.value) || 0)}
                      className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={addPrizeRow}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Position
                </button>
                <button
                  onClick={removePrizeRow}
                  disabled={formPrizes.length <= 1}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Minus className="w-3 h-3" /> Remove Last
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRace}
                  disabled={saving}
                  className="flex-1 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? "Saving…" : currentActiveMeta ? "Save Changes" : "Create Race"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Live standings preview */}
        <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
          <h2 className="text-white font-bold text-sm mb-4">Current Race Standings</h2>
          {!activeRace || activeRace.standings.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No wagers recorded yet this race</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {activeRace.standings.map((row) => (
                <div key={row.userId ?? row.displayName} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/3">
                  <span className="text-gray-400 text-xs w-5 shrink-0 text-right">{row.position}</span>
                  <span className="text-gray-200 text-sm flex-1 truncate">{row.kickUsername ?? row.displayName}</span>
                  {row.prizeAmount !== null && <span className="text-gold-400 text-[10px] font-bold shrink-0">${row.prizeAmount}</span>}
                  <span className="text-white text-xs font-semibold shrink-0">${Number(row.wagered).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All races (past + current) */}
      {races.length > 0 && (
        <div className="mb-10">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">All Races</p>
          <div className="space-y-2">
            {races.map((r) => (
              <div key={r.id} className="bg-navy-800/50 border border-white/6 rounded-xl p-4 flex items-center gap-3">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${r.status === "active" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400"}`}>
                  {r.status === "active" ? "ACTIVE" : "ENDED"}
                </span>
                <span className="text-gray-300 text-sm flex-1">
                  {formatLondon(r.startDate, "d MMM")}
                  {" – "}
                  {formatLondon(r.endDate, "d MMM yyyy, HH:mm")}
                </span>
                <span className="text-gray-400 text-xs shrink-0">{r.prizes.length} position{r.prizes.length !== 1 ? "s" : ""} · ${r.totalPrizePool}</span>
                {r.status === "active" && (
                  <button onClick={() => handleDeleteRace(r.id)} className="text-gray-400 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout history */}
      {history.length > 0 && (
        <div className="mb-10">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payout History</p>
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="bg-navy-800/50 border border-white/6 rounded-xl p-4">
                <p className="text-gray-400 text-xs font-semibold mb-2">
                  {formatLondon(entry.startDate, "d MMM")}
                  {" – "}
                  {formatLondon(entry.endDate, "d MMM yyyy, HH:mm")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {entry.winners.map((w) => (
                    <span key={w.userId} className="text-xs text-gray-300 bg-navy-900/60 border border-white/5 rounded-lg px-2.5 py-1">
                      #{w.position} {w.kickUsername ?? w.displayName} — ${w.prizeAmount}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
