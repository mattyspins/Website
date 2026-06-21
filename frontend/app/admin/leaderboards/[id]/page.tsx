"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Trophy, Download, Plus, Users, Search, X, Crown, Radio, EyeOff, Pencil, Check } from "lucide-react";

interface User { id: string; displayName: string; kickUsername?: string; }
interface Ranking {
  rank: number; userId: string; username: string;
  kickUsername?: string; totalWagers: number; wagerCount: number;
  prize?: string; prizeDescription?: string;
  isExternal?: boolean;
}
interface Leaderboard {
  id: string; title: string; description?: string;
  prizePool: string; status: string; startDate: string; endDate: string;
}

const RANK_COLORS: Record<number, string> = {
  1: "text-gold-400 bg-gold-500/15 border-gold-500/25",
  2: "text-gray-300 bg-white/8 border-white/10",
  3: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

export default function ManageLeaderboardPage() {
  const { id: leaderboardId } = useParams() as { id: string };

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);

  // Add wager form
  const [playerType, setPlayerType] = useState<"registered" | "external">("registered");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [externalName, setExternalName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wagerMsg, setWagerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inline edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => { fetchDetails(); fetchLiveStatus(); }, [leaderboardId]);

  const fetchDetails = async () => {
    try {
      const r = await api.get(`/api/manual-leaderboards/${leaderboardId}`);
      if (r.success) { setLeaderboard(r.data.leaderboard); setRankings(r.data.rankings); }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const fetchLiveStatus = async () => {
    try {
      const r = await api.get("/api/manual-leaderboards/live");
      if (r.success) setIsLive(r.leaderboardId === leaderboardId);
    } catch { /* ignore */ }
  };

  const handleGoLive = async () => {
    setLiveLoading(true);
    try {
      const r = await api.post("/api/manual-leaderboards/admin/go-live", { leaderboardId });
      if (r.success) setIsLive(true);
    } catch { /* ignore */ } finally { setLiveLoading(false); }
  };

  const handleTakeDown = async () => {
    setLiveLoading(true);
    try {
      const r = await api.delete("/api/manual-leaderboards/admin/go-live");
      if (r.success) setIsLive(false);
    } catch { /* ignore */ } finally { setLiveLoading(false); }
  };

  const searchUsers = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      const r = await api.get(`/api/admin/users/search?query=${encodeURIComponent(q)}`);
      if (r.success && r.data?.users) setResults(r.data.users);
      else setResults([]);
    } catch { setResults([]); }
  };

  const handleAddWager = async (e: React.FormEvent) => {
    e.preventDefault();
    const isExternal = playerType === "external";
    if (!isExternal && !selected) { setWagerMsg({ type: "error", text: "Select a player." }); return; }
    if (isExternal && !externalName.trim()) { setWagerMsg({ type: "error", text: "Enter the player name." }); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setWagerMsg({ type: "error", text: "Enter a valid amount." }); return; }
    setSubmitting(true); setWagerMsg(null);
    try {
      const body = isExternal
        ? { externalUsername: externalName.trim(), amount: amt, notes }
        : { userId: selected!.id, amount: amt, notes };
      const r = await api.post(`/api/manual-leaderboards/admin/${leaderboardId}/wagers`, body);
      if (r.success) {
        const name = isExternal ? externalName.trim() : selected!.displayName;
        setWagerMsg({ type: "success", text: `Wager added for ${name}. Total: $${r.userTotal?.toFixed(2) ?? amt.toFixed(2)}` });
        setAmount(""); setNotes("");
        if (isExternal) setExternalName(""); else { setSelected(null); setQuery(""); setResults([]); }
        fetchDetails();
      } else {
        setWagerMsg({ type: "error", text: r.error || "Failed to add wager." });
      }
    } catch { setWagerMsg({ type: "error", text: "Network error." }); } finally { setSubmitting(false); }
  };

  const handleUpdateWager = async (r: Ranking) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) return;
    setEditSubmitting(true);
    try {
      const body = r.isExternal
        ? { externalUsername: r.username, amount: amt }
        : { userId: r.userId, amount: amt };
      await api.put(`/api/manual-leaderboards/admin/${leaderboardId}/wagers`, body);
      setEditingRow(null);
      fetchDetails();
    } catch { /* ignore */ } finally { setEditSubmitting(false); }
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/manual-leaderboards/admin/${leaderboardId}/export?format=csv`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `leaderboard-${leaderboardId}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert("Export failed."); }
  };

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
    </div>
  );

  if (!leaderboard) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400">Leaderboard not found</p>
        <a href="/admin/leaderboards" className="text-gold-400 text-sm mt-2 inline-block">← Back</a>
      </div>
    </div>
  );

  const isActive = leaderboard.status === "active" && new Date(leaderboard.endDate).getTime() > Date.now();
  const msLeft = new Date(leaderboard.endDate).getTime() - Date.now();
  const dLeft = Math.floor(msLeft / 86400000);
  const hLeft = Math.floor((msLeft % 86400000) / 3600000);
  const timeLabel = msLeft <= 0 ? "Ended" : dLeft > 0 ? `${dLeft}d ${hLeft}h left` : `${hLeft}h left`;

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <a href="/admin/leaderboards" className="text-gray-500 hover:text-white transition-colors">← Leaderboards</a>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300 truncate">{leaderboard.title}</span>
        </div>

        {/* Header card */}
        <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-white font-black text-2xl font-gaming">{leaderboard.title}</h1>
                <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                  leaderboard.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25"
                  : leaderboard.status === "ended" ? "bg-gray-500/15 text-gray-400 border-gray-500/25"
                  : "bg-gold-500/15 text-gold-400 border-gold-500/25"
                }`}>
                  {leaderboard.status.toUpperCase()}
                </span>
              </div>
              {leaderboard.description && <p className="text-gray-500 text-sm mb-3">{leaderboard.description}</p>}
              <div className="flex flex-wrap gap-5 text-sm">
                <div><span className="text-gray-500">Prize Pool</span> <span className="text-gold-400 font-bold ml-1">{leaderboard.prizePool}</span></div>
                <div><span className="text-gray-500">Participants</span> <span className="text-white font-bold ml-1">{rankings.length}</span></div>
                <div><span className="text-gray-500">Ends</span> <span className={`font-bold ml-1 ${msLeft > 0 ? "text-green-400" : "text-gray-500"}`}>{timeLabel}</span></div>
                <div><span className="text-gray-500">{new Date(leaderboard.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {new Date(leaderboard.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {isLive ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                  </span>
                  <button
                    onClick={handleTakeDown}
                    disabled={liveLoading}
                    className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-semibold px-3 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Take Down
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoLive}
                  disabled={liveLoading}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  <Radio className="w-3.5 h-3.5" /> {liveLoading ? "Going Live…" : "Go Live"}
                </button>
              )}
              <a href={`/leaderboard/${leaderboard.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold px-3 py-2 rounded-xl text-xs transition-colors">
                View Public
              </a>
              <button onClick={exportCSV} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold px-3 py-2 rounded-xl text-xs transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Add wager */}
        {isActive && (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-gold-400" /> Add Wager
            </h2>
            <form onSubmit={handleAddWager} className="space-y-4">
              {/* Player type toggle */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block">Player *</label>
                <div className="flex gap-1 mb-3 bg-navy-900/60 border border-white/8 rounded-xl p-1 w-fit">
                  <button type="button" onClick={() => { setPlayerType("registered"); setExternalName(""); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${playerType === "registered" ? "bg-gold-500 text-white" : "text-gray-500 hover:text-white"}`}>
                    Website User
                  </button>
                  <button type="button" onClick={() => { setPlayerType("external"); setSelected(null); setQuery(""); setResults([]); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${playerType === "external" ? "bg-gold-500 text-white" : "text-gray-500 hover:text-white"}`}>
                    External Player
                  </button>
                </div>

                {playerType === "registered" ? (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <input value={query} onChange={(e) => searchUsers(e.target.value)}
                        placeholder="Search by username or Kick..." className="w-full bg-navy-900/60 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                      {selected && (
                        <button type="button" onClick={() => { setSelected(null); setQuery(""); setResults([]); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {results.length > 0 && !selected && (
                      <div className="absolute z-10 w-full mt-1 bg-navy-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                        {results.map((u) => (
                          <button key={u.id} type="button" onClick={() => { setSelected(u); setQuery(u.displayName); setResults([]); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                            <div className="w-7 h-7 rounded-full bg-yellow-600/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{u.displayName}</p>
                              {u.kickUsername && <p className="text-gray-500 text-xs">Kick: {u.kickUsername}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selected && (
                      <p className="text-green-400 text-xs mt-1.5 font-semibold">✓ {selected.displayName}{selected.kickUsername ? ` · Kick: ${selected.kickUsername}` : ""}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder="Enter their name or username…"
                      className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                    />
                    <p className="text-gray-600 text-xs mt-1">For players not registered on the website.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Wager Amount ($) *</label>
                  <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 150.00" className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional"
                    className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button type="submit" disabled={submitting || (playerType === "registered" ? !selected : !externalName.trim())}
                  className="bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  {submitting ? "Adding…" : "Add Wager"}
                </button>
                {wagerMsg && <p className={`text-sm font-medium ${wagerMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>{wagerMsg.text}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Rankings */}
        {rankings.length === 0 ? (
          <div className="text-center py-16 bg-navy-800/40 border border-white/5 rounded-2xl">
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No participants yet. Add wagers to populate the rankings.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[top3[1], top3[0], top3[2]].map((r, i) => {
                  if (!r) return <div key={i} />;
                  const pos = i === 1 ? 1 : i === 0 ? 2 : 3;
                  return (
                    <motion.div key={r.userId} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className={`bg-navy-800/60 border rounded-2xl p-4 text-center ${RANK_COLORS[pos] ? `border-${pos === 1 ? "gold-500/30" : pos === 2 ? "white/10" : "orange-500/20"}` : "border-white/6"} ${pos === 1 ? "ring-1 ring-gold-500/20" : ""}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-sm border ${RANK_COLORS[pos] ?? ""}`}>
                        {pos === 1 ? <Crown className="w-5 h-5" /> : `#${pos}`}
                      </div>
                      <p className="text-white font-bold text-sm truncate">{r.username}</p>
                      {r.kickUsername && <p className="text-gray-500 text-xs truncate">{r.kickUsername}</p>}
                      <p className={`font-black text-lg mt-1 ${pos === 1 ? "text-gold-400" : pos === 2 ? "text-gray-300" : "text-orange-400"}`}>
                        ${r.totalWagers.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {r.prize && <p className="text-green-400 text-xs font-semibold mt-1">{r.prize}</p>}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="bg-navy-800/60 border border-white/6 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
                <p className="text-white font-semibold text-sm">All Rankings <span className="text-gray-500 font-normal">({rankings.length})</span></p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs font-semibold uppercase tracking-widest border-b border-white/5">
                      <th className="text-left px-5 py-3">#</th>
                      <th className="text-left px-5 py-3">Player</th>
                      <th className="text-left px-5 py-3">Kick</th>
                      <th className="text-right px-5 py-3">Wagered</th>
                      <th className="text-right px-5 py-3">Entries</th>
                      <th className="text-right px-5 py-3">Prize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4">
                    {rankings.map((r) => {
                      const isEditing = editingRow === r.userId;
                      return (
                        <tr key={r.userId} className="hover:bg-white/2 transition-colors group">
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black border ${RANK_COLORS[r.rank] ?? "bg-white/5 border-white/8 text-gray-500"}`}>
                              {r.rank}
                            </span>
                          </td>
                          <td className="px-5 py-3 max-w-[160px]">
                            <span className="text-white font-medium truncate block">{r.username}</span>
                            {r.isExternal && <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">External</span>}
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{r.kickUsername || "—"}</td>
                          <td className="px-5 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                  <input
                                    type="number" step="0.01" min="0" autoFocus
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleUpdateWager(r); if (e.key === "Escape") setEditingRow(null); }}
                                    className="w-28 bg-navy-900 border border-gold-500/40 rounded-lg pl-6 pr-2 py-1 text-white text-sm text-right focus:outline-none focus:border-gold-500"
                                  />
                                </div>
                                <button onClick={() => handleUpdateWager(r)} disabled={editSubmitting}
                                  className="p-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors disabled:opacity-50">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingRow(null)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-bold text-gold-400">
                                  ${r.totalWagers.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => { setEditingRow(r.userId); setEditAmount(r.totalWagers.toFixed(2)); }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                                  title="Update wager total"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-500">{r.wagerCount}</td>
                          <td className="px-5 py-3 text-right">
                            {r.prize
                              ? <span className="text-green-400 font-semibold">{r.prize.startsWith("$") ? r.prize : `$${r.prize}`}</span>
                              : <span className="text-gray-700">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
