"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, TrendingUp, TrendingDown, DollarSign, Search,
  Pencil, Trash2, Plus, X, ChevronDown, ImageOff,
} from "lucide-react";
import {
  Hunt, Currency, CURRENCY_SYMBOLS,
  loadHunts, upsertHunt, deleteHunt,
  syncHuntsFromServer, pushHuntToServer, deleteHuntOnServer,
  calcGlobalStats, fmt,
  type GlobalStats,
} from "@/lib/huntTracker";
import { API_ENDPOINTS } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { isAuthenticated } from "@/lib/authPersistence";

/* ── helpers ─────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-5 flex flex-col gap-1">
      <span className={`text-2xl font-bold font-gaming ${valueClass}`}>{value}</span>
      <span className="text-gray-500 text-sm">{label}</span>
    </div>
  );
}

/* ── Slot image card (Highest Win / Multi) ───────────────── */
function SlotStatCard({
  label, value, slot,
}: {
  label: string;
  value: string | null;
  slot: GlobalStats["highestWin"];
}) {
  return (
    <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl bg-[#1a1535] border border-white/8 flex items-center justify-center shrink-0 overflow-hidden">
        {slot?.image ? (
          <img src={slot.image} alt={slot.slotName} className="w-full h-full object-cover rounded-xl" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-600">
            <ImageOff className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-wide text-center leading-tight px-1">No Image</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        <p className="text-white font-semibold truncate">{slot?.slotName ?? "–"}</p>
        <p className="text-gray-600 text-xs truncate">{slot?.provider ?? ""}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-white font-bold">{value ?? "N/A"}</p>
        <p className="text-gray-600 text-[10px]">–</p>
      </div>
    </div>
  );
}

/* ── Create Hunt modal ───────────────────────────────────── */
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD"];

function CreateHuntModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Hunt | null;
  onClose: () => void;
  onSave: (hunt: Hunt) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(initial?.name ?? "");
  const [startCost, setStartCost] = useState(initial?.startCost?.toString() ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "USD");
  const [date, setDate] = useState(initial?.date ?? today);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Hunt name is required";
    if (!startCost || isNaN(Number(startCost)) || Number(startCost) < 0) errs.startCost = "Enter a valid cost";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const hunt: Hunt = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      date,
      currency,
      startCost: parseFloat(startCost) || 0,
      bonuses: initial?.bonuses ?? [],
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      isStarted: initial?.isStarted ?? false,
    };
    onSave(hunt);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative bg-[#0f0c1e] border border-white/10 rounded-2xl w-full max-w-lg p-7 z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-gold-400" />
            <h2 className="text-white font-bold text-xl">
              {initial ? "Edit Hunt" : "Create New Hunt"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-gray-600 text-xs border border-white/8 rounded-lg px-2.5 py-1">
              <span className="font-mono">Tab</span> to navigate
            </span>
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Hunt Name */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Hunt Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter hunt name"
              className={`w-full bg-[#1a1535] border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 transition-colors ${errors.name ? "border-red-500" : "border-white/10"}`}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Start Cost */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Start Cost</label>
            <div className={`flex items-center bg-[#1a1535] border rounded-xl px-4 py-3 gap-2 focus-within:border-gold-500 transition-colors ${errors.startCost ? "border-red-500" : "border-white/10"}`}>
              <span className="text-gray-500 font-semibold">{CURRENCY_SYMBOLS[currency]}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={startCost}
                onChange={(e) => setStartCost(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            {errors.startCost && <p className="text-red-400 text-xs mt-1">{errors.startCost}</p>}
          </div>

          {/* Currency */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Currency</label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full bg-[#1a1535] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-colors appearance-none cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-[#1a1535]">
                    {CURRENCY_SYMBOLS[c]} {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#1a1535] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Cancel
            <kbd className="bg-[#2a2550] text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-mono">Esc</kbd>
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-[#0a0810] font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            {initial ? "Save Changes" : "Create Hunt"}
            <kbd className="bg-gold-600 text-[#0a0810] text-[10px] px-1.5 py-0.5 rounded font-mono">↵</kbd>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Delete confirm modal ────────────────────────────────── */
function DeleteModal({ hunt, onClose, onConfirm }: { hunt: Hunt; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-[#0f0c1e] border border-white/10 rounded-2xl w-full max-w-sm p-7 z-10 text-center"
      >
        <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">Delete Hunt</h3>
        <p className="text-gray-400 text-sm mb-6">Delete <span className="text-white font-semibold">{hunt.name}</span>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function HuntTrackerPage() {
  const router = useRouter();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [stats, setStats] = useState<GlobalStats>({
    huntCount: 0, totalCost: 0, totalWinnings: 0, pnl: 0,
    highestWin: null, highestMulti: null, lowestMulti: null,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editHunt, setEditHunt] = useState<Hunt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hunt | null>(null);
  const [search, setSearch] = useState("");
  const [liveHuntName, setLiveHuntName] = useState<string | null>(null);
  const [liveHuntId, setLiveHuntId] = useState<string | null>(null);
  const [clearingLive, setClearingLive] = useState(false);

  const reload = useCallback(() => {
    const h = loadHunts();
    setHunts(h);
    setStats(calcGlobalStats(h));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Pull in hunts created by other admins/mods, then re-render with the merged list.
  useEffect(() => {
    syncHuntsFromServer().then((merged) => {
      setHunts(merged);
      setStats(calcGlobalStats(merged));
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "c" || e.key === "C") && !showCreate && !editHunt && !deleteTarget
        && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShowCreate(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreate, editHunt, deleteTarget]);

  useEffect(() => {
    fetch(API_ENDPOINTS.LIVE_HUNT)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.hunt?.name) { setLiveHuntName(data.hunt.name); setLiveHuntId(data.hunt.id ?? null); } })
      .catch(() => {});
  }, []);

  async function handleClearLive() {
    if (!isAuthenticated()) return;
    setClearingLive(true);
    try {
      await authFetch(API_ENDPOINTS.LIVE_HUNT, { method: "DELETE" });
      setLiveHuntName(null);
    } finally {
      setClearingLive(false);
    }
  }

  function handleSaveHunt(hunt: Hunt) {
    upsertHunt(hunt);
    pushHuntToServer(hunt);
    reload();
    setShowCreate(false);
    setEditHunt(null);
  }

  function handleDelete(hunt: Hunt) {
    deleteHunt(hunt.id);
    deleteHuntOnServer(hunt.id);
    reload();
    setDeleteTarget(null);
  }

  const filtered = hunts.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const sym = CURRENCY_SYMBOLS["USD"];

  function fmtG(val: number) {
    return `${sym}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Target className="w-6 h-6 text-gold-400" />
            <h1 className="text-2xl font-bold font-gaming text-white tracking-wide">
              BONUS <span className="text-gold-400">HUNT TRACKER</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm ml-9">Track your bonus hunts, stats and results.</p>
        </motion.div>


        {/* ── Statistics ──────────────────────────────────────── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Statistics</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 bg-[#1a1535] border border-white/10 text-gray-300 text-sm px-4 py-2 rounded-xl hover:border-gold-500/50 transition-colors">
                All Time <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Top 4 stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <StatCard label="Bonus Hunts" value={stats.huntCount.toString()} />
            <StatCard label="Total Cost" value={`${sym}${stats.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <StatCard label="Winnings" value={`${sym}${stats.totalWinnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <StatCard
              label="PnL"
              value={`${stats.pnl >= 0 ? "+" : "-"}${sym}${Math.abs(stats.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              valueClass={stats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>

          {/* Slot highlight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SlotStatCard label="Highest Win" value={stats.highestWin ? fmtG(stats.highestWin.value) : "N/A"} slot={stats.highestWin} />
            <SlotStatCard label="Highest Multi" value={stats.highestMulti ? `${stats.highestMulti.value.toFixed(2)}x` : "N/A"} slot={stats.highestMulti} />
            <SlotStatCard label="Lowest Multi" value={stats.lowestMulti ? `${stats.lowestMulti.value.toFixed(2)}x` : "N/A"} slot={stats.lowestMulti} />
          </div>
        </section>

        {/* ── Activity ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-white font-bold text-lg">Activity</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hunts…"
                  className="bg-[#1a1535] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold-500 transition-colors w-44"
                />
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-[#0a0810] font-bold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Hunt
                <kbd className="bg-gold-600 text-[#0a0810] text-[10px] px-1.5 py-0.5 rounded font-mono">C</kbd>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0f0c1e]/80 border border-white/8 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_80px_120px_100px] px-5 py-3 border-b border-white/6">
              {["Hunt Title", "Start Cost", "Bonuses", "Profit/Loss", "Actions"].map((h) => (
                <span key={h} className="text-gray-600 text-xs uppercase tracking-widest font-semibold">{h}</span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">
                  {search ? "No hunts match your search." : "No hunts yet. Create your first one!"}
                </p>
              </div>
            ) : (
              <div>
                {filtered.map((hunt, i) => {
                  const openedBonuses = hunt.bonuses.filter((b) => b.payout !== null);
                  const winnings = openedBonuses.reduce((s, b) => s + (b.payout ?? 0), 0);
                  const pnl = winnings - hunt.startCost;
                  const sym2 = CURRENCY_SYMBOLS[hunt.currency];

                  return (
                    <motion.div
                      key={hunt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_80px_120px_100px] items-center px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      onClick={() => router.push(`/hunt-tracker/${hunt.id}`)}
                    >
                      {/* Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${hunt.id === liveHuntId ? "bg-emerald-400 animate-pulse" : hunt.isCompleted ? "bg-emerald-400" : hunt.isStarted ? "bg-gold-400 animate-pulse" : "bg-gray-600"}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-semibold text-sm truncate group-hover:text-gold-300 transition-colors">{hunt.name}</p>
                            {hunt.id === liveHuntId && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">LIVE</span>
                            )}
                            {hunt.isCompleted && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">DONE</span>
                            )}
                            {hunt.isStarted && !hunt.isCompleted && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30">OPENING</span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs">{fmtDate(hunt.date)}</p>
                        </div>
                      </div>

                      {/* Start Cost */}
                      <span className="hidden sm:block text-gray-300 text-sm font-semibold">
                        {sym2}{hunt.startCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>

                      {/* Bonuses */}
                      <span className="hidden sm:block text-gray-400 text-sm">{hunt.bonuses.length}</span>

                      {/* PnL */}
                      <span className={`hidden sm:block text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : "-"}{sym2}{Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        {hunt.id === liveHuntId && (
                          <button
                            onClick={handleClearLive}
                            disabled={clearingLive}
                            className="text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            title="Take down from live"
                          >
                            Take Down
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/hunt-tracker/${hunt.id}`)}
                          className="p-1.5 text-gray-600 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                          title="View"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditHunt(hunt)}
                          className="p-1.5 text-gray-600 hover:text-gold-400 rounded-lg hover:bg-white/5 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(hunt)}
                          className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                <div className="px-5 py-3 text-center text-gray-600 text-xs border-t border-white/5">
                  {filtered.length} hunt{filtered.length !== 1 ? "s" : ""} total
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showCreate || editHunt) && (
          <CreateHuntModal
            initial={editHunt}
            onClose={() => { setShowCreate(false); setEditHunt(null); }}
            onSave={handleSaveHunt}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            hunt={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
