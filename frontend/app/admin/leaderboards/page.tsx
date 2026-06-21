"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Trophy, Plus, Trash2, ExternalLink, Settings, X, ChevronDown } from "lucide-react";

interface Leaderboard {
  id: string;
  title: string;
  description?: string;
  prizePool: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface Prize {
  position: number;
  prizeAmount: string;
  prizeDescription?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-500/15 text-green-400 border-green-500/25",
  upcoming:  "bg-gold-500/15 text-gold-400 border-gold-500/25",
  ended:     "bg-gray-500/15 text-gray-400 border-gray-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function AdminLeaderboardsPage() {
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", prizePool: "", startDate: "", endDate: "" });
  const [prizes, setPrizes] = useState<Prize[]>([{ position: 1, prizeAmount: "", prizeDescription: "" }]);

  useEffect(() => { fetchLeaderboards(); }, []);

  const fetchLeaderboards = async () => {
    try {
      const r = await api.get("/api/manual-leaderboards?limit=50");
      if (r.success) setLeaderboards(r.leaderboards);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const r = await api.post("/api/manual-leaderboards/admin/create", {
        ...formData,
        prizes: prizes.filter((p) => p.prizeAmount.trim() !== ""),
      });
      if (r.success) {
        setMsg({ type: "success", text: "Leaderboard created." });
        setShowCreate(false);
        setFormData({ title: "", description: "", prizePool: "", startDate: "", endDate: "" });
        setPrizes([{ position: 1, prizeAmount: "", prizeDescription: "" }]);
        fetchLeaderboards();
      } else {
        setMsg({ type: "error", text: r.error || "Failed to create." });
      }
    } catch { setMsg({ type: "error", text: "Network error." }); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const r = await api.delete(`/api/manual-leaderboards/admin/${id}`);
      if (r.success) { setDeleteConfirm(null); fetchLeaderboards(); }
      else setMsg({ type: "error", text: r.error || "Failed to delete." });
    } catch { setMsg({ type: "error", text: "Network error." }); }
  };

  const updatePrize = (i: number, field: keyof Prize, value: string | number) => {
    const next = [...prizes];
    next[i] = { ...next[i], [field]: value };
    setPrizes(next);
  };

  const active = leaderboards.filter((l) => l.status === "active");
  const others = leaderboards.filter((l) => l.status !== "active");

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-500 hover:text-white text-sm transition-colors">← Admin</a>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-bold text-xl">Leaderboards</h1>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Leaderboard
          </button>
        </div>

        {msg && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold">Create Leaderboard</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs mb-1 block">Title *</label>
                    <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. May Wager Race" className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs mb-1 block">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2} placeholder="Optional" className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30 resize-none" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Prize Pool *</label>
                    <input required value={formData.prizePool} onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                      placeholder="e.g. $500" className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                  </div>
                  <div />
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Start Date *</label>
                    <input type="datetime-local" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">End Date *</label>
                    <input type="datetime-local" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                  </div>
                </div>

                {/* Prizes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400 text-xs">Prize Distribution</label>
                    <button type="button" onClick={() => setPrizes([...prizes, { position: prizes.length + 1, prizeAmount: "", prizeDescription: "" }])}
                      className="text-gold-400 hover:text-gold-300 text-xs font-semibold transition-colors">+ Add position</button>
                  </div>
                  <div className="space-y-2">
                    {prizes.map((p, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-gray-500 text-xs w-8 text-center shrink-0">#{p.position}</span>
                        <input value={p.prizeAmount} onChange={(e) => updatePrize(i, "prizeAmount", e.target.value)}
                          placeholder="Prize (e.g. $100)" className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                        <input value={p.prizeDescription ?? ""} onChange={(e) => updatePrize(i, "prizeDescription", e.target.value)}
                          placeholder="Label (optional)" className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                        {prizes.length > 1 && (
                          <button type="button" onClick={() => setPrizes(prizes.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 transition-colors p-1"><X className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                    {saving ? "Creating…" : "Create Leaderboard"}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="bg-white/5 hover:bg-white/10 text-gray-400 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-navy-800/40 border border-white/5 rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : leaderboards.length === 0 ? (
          <div className="text-center py-20 bg-navy-800/40 border border-white/5 rounded-2xl">
            <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold mb-1">No leaderboards yet</p>
            <p className="text-gray-600 text-sm">Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Active</p>
                <div className="space-y-3">
                  {active.map((lb) => <LeaderboardCard key={lb.id} lb={lb} onDelete={() => setDeleteConfirm(lb.id)} />)}
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">All Others</p>
                <div className="space-y-3">
                  {others.map((lb) => <LeaderboardCard key={lb.id} lb={lb} onDelete={() => setDeleteConfirm(lb.id)} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-navy-900 border border-red-500/25 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-white font-bold mb-2">Delete Leaderboard?</h3>
                <p className="text-gray-400 text-sm mb-5">This removes all associated wagers and prizes and cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors">Delete</button>
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold py-2 rounded-xl text-sm transition-colors">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeaderboardCard({ lb, onDelete }: { lb: Leaderboard; onDelete: () => void }) {
  const ended = new Date(lb.endDate).getTime() < Date.now();
  const ms = new Date(lb.endDate).getTime() - Date.now();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const timeLabel = ms <= 0 ? `Ended ${new Date(lb.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : d > 0 ? `${d}d ${h}h remaining` : `${h}h remaining`;

  return (
    <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-4 sm:p-5 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-white font-bold truncate">{lb.title}</h3>
          <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[lb.status] ?? STATUS_COLORS.ended}`}>
            {lb.status.toUpperCase()}
          </span>
        </div>
        {lb.description && <p className="text-gray-500 text-xs mb-1.5 truncate">{lb.description}</p>}
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="text-gold-400 font-semibold">{lb.prizePool}</span>
          <span>{new Date(lb.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {new Date(lb.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span className={ended ? "text-gray-600" : "text-green-400"}>{timeLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a href={`/admin/leaderboards/${lb.id}`}
          className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 text-white font-semibold px-3 py-2 rounded-xl text-xs transition-colors">
          <Settings className="w-3.5 h-3.5" /> Manage
        </a>
        <a href={`/leaderboard/${lb.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 font-semibold px-3 py-2 rounded-xl text-xs transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> View
        </a>
        <button onClick={onDelete} className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
