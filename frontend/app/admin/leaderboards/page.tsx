"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Trophy, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { wagerLeaderboardApi, MonthlyStandingRow, MonthlyHistoryEntry, MonthlyPrize, AllWagererRow } from "@/lib/api/wagerLeaderboard";

interface OldLeaderboard {
  id: string;
  title: string;
  status: string;
  prizePool: string;
  startDate: string;
  endDate: string;
}

function maskUsername(username: string): string {
  if (username.length <= 3) return username;
  return `${username[0]}${"*".repeat(Math.min(username.length - 3, 10))}${username.slice(-2)}`;
}

export default function AdminLeaderboardsPage() {
  const [prizes, setPrizes] = useState<MonthlyPrize[]>([]);
  const [standings, setStandings] = useState<MonthlyStandingRow[]>([]);
  const [history, setHistory] = useState<MonthlyHistoryEntry[]>([]);
  const [oldLeaderboards, setOldLeaderboards] = useState<OldLeaderboard[]>([]);
  const [wagerers, setWagerers] = useState<AllWagererRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    try {
      const [p, s, h, old, w] = await Promise.all([
        wagerLeaderboardApi.getPrizes(),
        wagerLeaderboardApi.getMonthly(),
        wagerLeaderboardApi.getMonthlyHistory(),
        api.get("/api/manual-leaderboards?limit=50").catch(() => ({ leaderboards: [] })),
        wagerLeaderboardApi.getAllWagerers().catch(() => []),
      ]);
      setPrizes(p);
      setStandings(s);
      setHistory(h);
      setOldLeaderboards(old.leaderboards ?? []);
      setWagerers(w);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updatePoints = (position: number, points: number) => {
    setPrizes((prev) => prev.map((p) => (p.position === position ? { ...p, points } : p)));
  };

  const handleSavePrizes = async () => {
    setSaving(true); setMsg(null);
    try {
      const updated = await wagerLeaderboardApi.setPrizes(prizes.map((p) => ({ position: p.position, points: p.points })));
      setPrizes(updated);
      setMsg({ type: "success", text: "Prize table saved." });
    } catch {
      setMsg({ type: "error", text: "Failed to save prize table." });
    } finally { setSaving(false); }
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
    if (!confirm("Delete this old leaderboard? This removes all associated wagers and prizes.")) return;
    try {
      await api.delete(`/api/manual-leaderboards/admin/${id}`);
      setOldLeaderboards((prev) => prev.filter((l) => l.id !== id));
    } catch { setMsg({ type: "error", text: "Failed to delete." }); }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const totalPoints = prizes.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
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

          {/* Prize table editor */}
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">Monthly Prize Table</h2>
              <span className="text-gold-400 text-xs font-bold">{totalPoints} pts total</span>
            </div>
            <p className="text-gray-500 text-xs mb-4">
              Points awarded automatically to each position when the calendar month ends. Auto-sourced from Razed wager data — no manual entry needed.
            </p>
            <div className="space-y-1.5 mb-4">
              {prizes.map((p) => (
                <div key={p.position} className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-10 shrink-0">#{p.position}</span>
                  <input
                    type="number" min={0}
                    value={p.points}
                    onChange={(e) => updatePoints(p.position, parseInt(e.target.value) || 0)}
                    className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                  />
                  <span className="text-gray-600 text-xs shrink-0">pts</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleSavePrizes}
              disabled={saving}
              className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving ? "Saving…" : "Save Prize Table"}
            </button>
          </div>

          {/* Live standings preview */}
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
            <h2 className="text-white font-bold text-sm mb-4">Current Month Standings</h2>
            {standings.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No wagers recorded yet this month</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {standings.map((row) => (
                  <div key={row.userId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/3">
                    <span className="text-gray-600 text-xs w-5 shrink-0 text-right">{row.position}</span>
                    <span className="text-gray-200 text-sm flex-1 truncate">{maskUsername(row.kickUsername ?? row.displayName)}</span>
                    {row.points !== null && <span className="text-gold-400 text-[10px] font-bold shrink-0">{row.points}pt</span>}
                    <span className="text-white text-xs font-semibold shrink-0">${Number(row.wagered).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payout history */}
        {history.length > 0 && (
          <div className="mb-10">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Payout History</p>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.monthStart} className="bg-navy-800/50 border border-white/6 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-semibold mb-2">
                    {new Date(entry.monthStart).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.winners.map((w) => (
                      <span key={w.userId} className="text-xs text-gray-300 bg-navy-900/60 border border-white/5 rounded-lg px-2.5 py-1">
                        #{w.position} {maskUsername(w.kickUsername ?? w.displayName)} — {w.pointsAwarded}pt
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              All Wagerers Under Our Code ({wagerers.length})
            </p>
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
                    {wagerers.map((w) => (
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
    </div>
  );
}
