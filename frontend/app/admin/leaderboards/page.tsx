"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Trophy, ExternalLink, Trash2, RefreshCw, Plus, Minus } from "lucide-react";
import { useConfirm } from "@/components/admin/useConfirm";
import {
  wagerLeaderboardApi,
  ActiveRace,
  RaceHistoryEntry,
  AdminRace,
  RacePrize,
  AllWagererRow,
} from "@/lib/api/wagerLeaderboard";

interface OldLeaderboard {
  id: string;
  title: string;
  status: string;
  prizePool: string;
  startDate: string;
  endDate: string;
}

const DEFAULT_PRIZE_AMOUNTS = [200, 100, 70, 30, 30, 20, 20, 10, 10, 10];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeDefaultPrizes(): RacePrize[] {
  return DEFAULT_PRIZE_AMOUNTS.map((amount, i) => ({ position: i + 1, amount }));
}

export default function AdminLeaderboardsPage() {
  const [activeRace, setActiveRace] = useState<ActiveRace | null>(null);
  const [races, setRaces] = useState<AdminRace[]>([]);
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);
  const [oldLeaderboards, setOldLeaderboards] = useState<OldLeaderboard[]>([]);
  const [wagerers, setWagerers] = useState<AllWagererRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [wagererSearch, setWagererSearch] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Create/edit race form state
  const [editing, setEditing] = useState(false);
  const [formStart, setFormStart] = useState(todayISO());
  const [formEnd, setFormEnd] = useState(todayISO());
  const [formPrizes, setFormPrizes] = useState<RacePrize[]>(makeDefaultPrizes());

  const load = async () => {
    try {
      const [active, races, h, old, w] = await Promise.all([
        wagerLeaderboardApi.getActive(),
        wagerLeaderboardApi.listRaces(),
        wagerLeaderboardApi.getHistory(),
        api.get("/api/manual-leaderboards?limit=50").catch(() => ({ leaderboards: [] })),
        wagerLeaderboardApi.getAllWagerers().catch(() => []),
      ]);
      setActiveRace(active);
      setRaces(races);
      setHistory(h);
      setOldLeaderboards(old.leaderboards ?? []);
      setWagerers(w);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const currentActiveMeta = races.find((r) => r.status === "active");

  const startEditing = () => {
    if (currentActiveMeta) {
      setFormStart(currentActiveMeta.startDate);
      setFormEnd(currentActiveMeta.endDate);
      setFormPrizes(currentActiveMeta.prizes.length > 0 ? currentActiveMeta.prizes : makeDefaultPrizes());
    } else {
      setFormStart(todayISO());
      setFormEnd(todayISO());
      setFormPrizes(makeDefaultPrizes());
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
    setSaving(true); setMsg(null);
    try {
      if (currentActiveMeta) {
        await wagerLeaderboardApi.updateRace(currentActiveMeta.id, {
          startDate: formStart,
          endDate: formEnd,
          prizes: formPrizes,
        }).then((r: any) => { if (r?.error) throw new Error(r.error); });
        setMsg({ type: "success", text: "Race updated." });
      } else {
        await wagerLeaderboardApi.createRace({ startDate: formStart, endDate: formEnd, prizes: formPrizes });
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

  const handleResync = async () => {
    setResyncing(true); setMsg(null);
    try {
      await wagerLeaderboardApi.resync();
      await load();
      setMsg({ type: "success", text: "Resynced from Razed." });
    } catch {
      setMsg({ type: "error", text: "Resync failed." });
    } finally { setResyncing(false); }
  };

  const handleDeleteOld = async (id: string) => {
    if (!(await confirm({ title: "Delete this leaderboard?", message: "This removes all associated wagers and prizes. This cannot be undone.", confirmText: "Delete" }))) return;
    try {
      await api.delete(`/api/manual-leaderboards/admin/${id}`);
      setOldLeaderboards((prev) => prev.filter((l) => l.id !== id));
    } catch { setMsg({ type: "error", text: "Failed to delete." }); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const formTotal = formPrizes.reduce((sum, p) => sum + p.amount, 0);
  const filteredWagerers = wagererSearch.trim()
    ? wagerers.filter((w) => {
        const q = wagererSearch.trim().toLowerCase();
        return (
          w.razedUsername.toLowerCase().includes(q) ||
          w.displayName?.toLowerCase().includes(q) ||
          w.kickUsername?.toLowerCase().includes(q)
        );
      })
    : wagerers;

  return (
    <div className="pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-500 hover:text-white text-sm transition-colors">← Admin</a>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-bold text-xl">Wager Leaderboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResync}
              disabled={resyncing}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resyncing ? "animate-spin" : ""}`} />
              {resyncing ? "Syncing…" : "Resync from Razed"}
            </button>
            <a href="/leaderboard" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View Public Page
            </a>
          </div>
        </div>

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
                  {currentActiveMeta ? `$${currentActiveMeta.prizes.reduce((s, p) => s + p.amount, 0)} total` : ""}
                </span>
              )}
            </div>

            {!editing ? (
              <>
                {currentActiveMeta ? (
                  <>
                    <p className="text-gray-500 text-xs mb-4">
                      {new Date(currentActiveMeta.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                      {" – "}
                      {new Date(currentActiveMeta.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      {" · "}{currentActiveMeta.prizes.length} paid position{currentActiveMeta.prizes.length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1 mb-4">
                      {currentActiveMeta.prizes.map((p) => (
                        <div key={p.position} className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500 w-8 shrink-0">#{p.position}</span>
                          <span className="text-white font-semibold">${p.amount}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm mb-4">
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
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
                    <input
                      type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                      className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">End Date</label>
                    <input
                      type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-xs">Prize Positions</label>
                  <span className="text-gold-400 text-xs font-bold">${formTotal} total</span>
                </div>
                <div className="space-y-1.5 mb-3 max-h-60 overflow-y-auto pr-1">
                  {formPrizes.map((p, i) => (
                    <div key={p.position} className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs w-10 shrink-0">#{p.position}</span>
                      <span className="text-gray-600 text-xs shrink-0">$</span>
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
              <p className="text-gray-600 text-sm text-center py-8">No wagers recorded yet this race</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {activeRace.standings.map((row) => (
                  <div key={row.userId ?? row.displayName} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/3">
                    <span className="text-gray-600 text-xs w-5 shrink-0 text-right">{row.position}</span>
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">All Races</p>
            <div className="space-y-2">
              {races.map((r) => (
                <div key={r.id} className="bg-navy-800/50 border border-white/6 rounded-xl p-4 flex items-center gap-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${r.status === "active" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400"}`}>
                    {r.status === "active" ? "ACTIVE" : "ENDED"}
                  </span>
                  <span className="text-gray-300 text-sm flex-1">
                    {new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    {" – "}
                    {new Date(r.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </span>
                  <span className="text-gray-500 text-xs shrink-0">{r.prizes.length} position{r.prizes.length !== 1 ? "s" : ""} · ${r.prizes.reduce((s, p) => s + p.amount, 0)}</span>
                  {r.status === "active" && (
                    <button onClick={() => handleDeleteRace(r.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Payout History</p>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="bg-navy-800/50 border border-white/6 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-semibold mb-2">
                    {new Date(entry.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    {" – "}
                    {new Date(entry.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
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

        {/* All Razed wagerers, linked or not */}
        {wagerers.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                All Wagerers Under Our Code ({filteredWagerers.length}{filteredWagerers.length !== wagerers.length ? ` of ${wagerers.length}` : ""})
              </p>
              <input
                type="text"
                value={wagererSearch}
                onChange={(e) => setWagererSearch(e.target.value)}
                placeholder="Search username…"
                className="bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm w-56 focus:outline-none focus:border-gold-500/30 placeholder:text-gray-600"
              />
            </div>
            <div className="bg-navy-800/60 border border-white/6 rounded-2xl overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-navy-800 text-gray-500 text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2.5">Razed Username</th>
                      <th className="text-left font-semibold px-4 py-2.5">Site Account</th>
                      <th className="text-right font-semibold px-4 py-2.5">Weekly</th>
                      <th className="text-right font-semibold px-4 py-2.5">Monthly</th>
                      <th className="text-right font-semibold px-4 py-2.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWagerers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-600">No wagerers match "{wagererSearch}"</td>
                      </tr>
                    ) : filteredWagerers.map((w) => (
                      <tr key={w.razedUsername} className="border-t border-white/4 hover:bg-white/3">
                        <td className="px-4 py-2.5 text-gray-300">{w.razedUsername}</td>
                        <td className="px-4 py-2.5">
                          {w.linked ? (
                            <a href={`/admin/users/${w.userId}`} className="text-gold-400 hover:underline">
                              {w.kickUsername ?? w.displayName}
                              {!w.verified && <span className="text-yellow-400 text-[10px] font-bold ml-1.5">PENDING</span>}
                            </a>
                          ) : (
                            <span className="text-gray-600">Not linked</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-300">${Number(w.weeklyWagered).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-gray-300">${Number(w.monthlyWagered).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-white font-semibold">${Number(w.totalWagered).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Old manual races, read-only */}
        {oldLeaderboards.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Past Manual Races (legacy)</p>
            <div className="space-y-2">
              {oldLeaderboards.map((lb) => (
                <div key={lb.id} className="bg-navy-800/40 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-gray-600 shrink-0" />
                  <span className="text-gray-300 text-sm flex-1 truncate">{lb.title}</span>
                  <span className="text-gray-600 text-xs shrink-0">{lb.prizePool}</span>
                  <a href={`/leaderboard/${lb.id}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => handleDeleteOld(lb.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
