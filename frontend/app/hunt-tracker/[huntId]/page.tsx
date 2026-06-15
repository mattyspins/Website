"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Search, Shuffle, Play, ChevronDown,
  Pencil, Trash2, ImageOff, ChevronUp, SlidersHorizontal, Radio, EyeOff,
} from "lucide-react";
import {
  Hunt, HuntBonus, BadgeType, CURRENCY_SYMBOLS,
  getHunt, upsertHunt, calcHuntStats, fmt, fmtMulti,
} from "@/lib/huntTracker";
import { SLOT_GAMES, type SlotGame } from "@/lib/slotGames";
import { API_ENDPOINTS } from "@/lib/api";
import { slotRequestApi, SlotRequest } from "@/lib/api/slotRequests";
import { getSocket } from "@/lib/socket";

/* ── helpers ─────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

/* ── Badge pill ──────────────────────────────────────────── */
const BADGE_CONFIG: Record<BadgeType, { label: string; cls: string }> = {
  none:         { label: "",            cls: "" },
  super_bonus:  { label: "SUPER",       cls: "bg-amber-500/20 text-amber-400 border border-amber-500/40" },
  five_scatter: { label: "5 SCATTER",   cls: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
  custom:       { label: "CUSTOM",      cls: "bg-gold-500/20 text-gold-400 border border-gold-500/40" },
};

function BadgePill({ badge, custom }: { badge: BadgeType; custom?: string }) {
  const cfg = BADGE_CONFIG[badge];
  if (badge === "none") return null;
  const label = badge === "custom" && custom ? custom.toUpperCase() : cfg.label;
  return <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${cfg.cls}`}>{label}</span>;
}

/* ── Slot image ──────────────────────────────────────────── */
function SlotImg({ src, alt, size = 10 }: { src: string; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  const px = size * 4;
  if (err || !src) {
    return (
      <div
        className="rounded-lg bg-[#1a1535] border border-white/8 flex items-center justify-center shrink-0 text-gray-600 font-bold"
        style={{ width: px, height: px, fontSize: px * 0.35 }}
      >
        {alt?.[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className="rounded-lg object-cover shrink-0"
      style={{ width: px, height: px }}
    />
  );
}

/* ── Add Bonus Modal ─────────────────────────────────────── */
const BADGES: { value: BadgeType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "super_bonus", label: "Super Bonus" },
  { value: "five_scatter", label: "5 Scatter" },
  { value: "custom", label: "Custom" },
];

function AddBonusModal({
  initial,
  currency,
  prefillSlotName,
  onClose,
  onSave,
}: {
  initial?: HuntBonus | null;
  currency: string;
  prefillSlotName?: string;
  onClose: () => void;
  onSave: (b: HuntBonus) => void;
}) {
  const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? "$";
  const [query, setQuery] = useState("");
  const prefilled = prefillSlotName
    ? SLOT_GAMES.find((g) => g.name.toLowerCase() === prefillSlotName.toLowerCase()) ??
      SLOT_GAMES.find((g) => g.name.toLowerCase().includes(prefillSlotName.toLowerCase())) ?? null
    : null;
  const [selected, setSelected] = useState<SlotGame | null>(
    initial ? { name: initial.slotName, provider: initial.provider, image: initial.image, volatility: "High" } : prefilled
  );
  const [betSize, setBetSize] = useState(initial?.betSize?.toString() ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [badge, setBadge] = useState<BadgeType>(initial?.badge ?? "none");
  const [customBadge, setCustomBadge] = useState(initial?.customBadge ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const results = query.length >= 1
    ? SLOT_GAMES.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.provider.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : [];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!selected) errs.slot = "Select a slot";
    if (!betSize || isNaN(Number(betSize)) || Number(betSize) <= 0) errs.betSize = "Enter a valid bet size";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const bonus: HuntBonus = {
      id: initial?.id ?? uid(),
      slotName: selected!.name,
      provider: selected!.provider,
      image: selected!.image,
      betSize: parseFloat(betSize),
      payout: initial?.payout ?? null,
      badge,
      customBadge: badge === "custom" ? customBadge : undefined,
      note: note.trim() || undefined,
      addedAt: initial?.addedAt ?? new Date().toISOString(),
    };
    onSave(bonus);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative bg-[#0f0c1e] border border-white/10 rounded-2xl w-full max-w-lg p-7 z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-gold-400" />
            <h2 className="text-white font-bold text-xl">{initial ? "Edit Bonus" : "Add Bonus to Hunt"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          {/* Slot search / selected */}
          {selected ? (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Selected Slot</label>
              <div className="flex items-center gap-3 bg-[#1a1535] border border-white/10 rounded-xl px-4 py-3">
                <SlotImg src={selected.image} alt={selected.name} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{selected.name}</p>
                  <p className="text-gray-500 text-xs">{selected.provider}</p>
                </div>
                <button
                  onClick={() => { setSelected(null); setQuery(""); setTimeout(() => searchRef.current?.focus(), 50); }}
                  className="text-gold-400 hover:text-gold-300 text-xs font-semibold transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Search for Slot <span className="text-gray-600">(Type to search)</span>
              </label>
              <div className={`relative bg-[#1a1535] border rounded-xl focus-within:border-gold-500 transition-colors ${errors.slot ? "border-red-500" : "border-white/10"}`}>
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-600" />
                <input
                  ref={searchRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a slot game…"
                  className="w-full bg-transparent pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              {errors.slot && <p className="text-red-400 text-xs mt-1">{errors.slot}</p>}
              {results.length > 0 && (
                <div className="mt-1 bg-[#1a1535] border border-white/10 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {results.map((slot) => (
                    <button
                      key={`${slot.provider}-${slot.name}`}
                      onClick={() => { setSelected(slot); setQuery(""); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <SlotImg src={slot.image} alt={slot.name} size={8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{slot.name}</p>
                        <p className="text-gray-500 text-xs">{slot.provider}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bet Size */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Bet Size <span className="text-red-400">*</span></label>
            <div className={`flex items-center bg-[#1a1535] border rounded-xl px-4 py-3 gap-2 focus-within:border-gold-500 transition-colors ${errors.betSize ? "border-red-500" : "border-white/10"}`}>
              <span className="text-gray-500 font-semibold">{sym}</span>
              <input
                type="number" min="0.01" step="0.01"
                value={betSize}
                onChange={(e) => setBetSize(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            {errors.betSize && <p className="text-red-400 text-xs mt-1">{errors.betSize}</p>}
          </div>

          {/* Note */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Note <span className="text-gray-600">(optional)</span></label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this bonus…"
              className="w-full bg-[#1a1535] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          {/* Badge */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Badge <span className="text-gray-600">(optional)</span></label>
            <div className="flex gap-2 flex-wrap">
              {BADGES.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBadge(b.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    badge === b.value
                      ? b.value === "super_bonus" ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                        : b.value === "five_scatter" ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                        : b.value === "custom" ? "bg-gold-500/20 text-gold-400 border-gold-500/50"
                        : "bg-white/10 text-white border-white/30"
                      : "bg-[#1a1535] text-gray-400 border-white/10 hover:border-white/20"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {badge === "custom" && (
              <input
                value={customBadge}
                onChange={(e) => setCustomBadge(e.target.value)}
                placeholder="Enter badge text…"
                maxLength={16}
                className="mt-2 w-full bg-[#1a1535] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold-500 transition-colors"
              />
            )}
          </div>
        </div>

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
            {initial ? "Save Changes" : "Add Bonus"}
            <kbd className="bg-gold-600 text-[#0a0810] text-[10px] px-1.5 py-0.5 rounded font-mono">↵</kbd>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Open Bonus Modal ────────────────────────────────────── */
function OpenBonusModal({
  bonus, currency, onClose, onSave,
}: {
  bonus: HuntBonus;
  currency: string;
  onClose: () => void;
  onSave: (payout: number) => void;
}) {
  const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? "$";
  const [payout, setPayout] = useState(bonus.payout?.toString() ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function handleSubmit() {
    if (!payout || isNaN(Number(payout)) || Number(payout) < 0) {
      setError("Enter a valid payout amount");
      return;
    }
    onSave(parseFloat(payout));
  }

  const multi = payout && Number(payout) >= 0 && bonus.betSize > 0
    ? (Number(payout) / bonus.betSize).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative bg-[#0f0c1e] border border-white/10 rounded-2xl w-full max-w-sm p-7 z-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <SlotImg src={bonus.image} alt={bonus.slotName} size={12} />
          <div>
            <p className="text-white font-bold">{bonus.slotName}</p>
            <p className="text-gray-500 text-xs">{bonus.provider} · Bet: {sym}{bonus.betSize.toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm text-gray-400 mb-2 block">Payout Amount</label>
          <div className={`flex items-center bg-[#1a1535] border rounded-xl px-4 py-3 gap-2 focus-within:border-gold-500 transition-colors ${error ? "border-red-500" : "border-white/10"}`}>
            <span className="text-gray-500 font-semibold">{sym}</span>
            <input
              autoFocus
              type="number" min="0" step="0.01"
              value={payout}
              onChange={(e) => { setPayout(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="0.00"
              className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none"
            />
          </div>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          {multi && (
            <p className="text-gray-500 text-xs mt-2">
              Multiplier: <span className="text-gold-400 font-bold">{multi}x</span>
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 bg-gold-500 hover:bg-gold-400 text-[#0a0810] font-bold py-2.5 rounded-xl transition-colors text-sm">Save Payout</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Small stat box ──────────────────────────────────────── */
function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-4 flex flex-col gap-1 text-center">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-white font-bold text-lg leading-tight">{value}</span>
      {sub && <span className="text-gray-600 text-[10px]">{sub}</span>}
    </div>
  );
}

/* ── Sort types ──────────────────────────────────────────── */
type SortKey = "date" | "betSize" | "payout" | "multi";
type SortDir = "asc" | "desc";

/* ── Page ────────────────────────────────────────────────── */
export default function HuntDetailPage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params.huntId as string;

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [showAddBonus, setShowAddBonus] = useState(false);
  const [editBonus, setEditBonus] = useState<HuntBonus | null>(null);
  const [openBonus, setOpenBonus] = useState<HuntBonus | null>(null);
  const [deleteBonus, setDeleteBonus] = useState<HuntBonus | null>(null);
  const [searchGame, setSearchGame] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showPace, setShowPace] = useState(false);
  // Opening mode
  const [openingMode, setOpeningMode] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [payoutInput, setPayoutInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Slot requests
  const [slotRequests, setSlotRequests] = useState<SlotRequest[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [srLoading, setSrLoading] = useState(false);
  const [addFromRequest, setAddFromRequest] = useState<{ requestId: string; slotName: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const reload = useCallback(() => {
    const h = getHunt(huntId);
    setHunt(h);
  }, [huntId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(API_ENDPOINTS.LIVE_HUNT, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.hunt) return;
        if (d.hunt.id === huntId) {
          setIsLive(true);
          // If hunt wasn't in localStorage (different browser/session), recover it from the backend
          if (!getHunt(huntId)) {
            upsertHunt(d.hunt);
            setHunt(d.hunt);
          }
        }
      })
      .catch(() => {});
  }, [huntId]);

  // Admin check + initial slot request load
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.user?.isAdmin || d.user?.isModerator) setIsAdmin(true); })
      .catch(() => {});

    Promise.all([slotRequestApi.getStatus(), slotRequestApi.getAll()])
      .then(([open, reqs]) => { setRequestsOpen(open); setSlotRequests(reqs); })
      .catch(() => {});
  }, []);

  // Poll slot requests every 8s
  useEffect(() => {
    const id = setInterval(() => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      slotRequestApi.getAll().then(setSlotRequests).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Socket for slot request real-time events
  useEffect(() => {
    const socket = getSocket();
    const onStatus = ({ open }: { open: boolean }) => setRequestsOpen(open);
    const onNew = (req: SlotRequest) => setSlotRequests((prev) => [req, ...prev]);
    const onUpdated = (req: SlotRequest) => setSlotRequests((prev) => prev.map((r) => r.id === req.id ? req : r));
    const onCleared = () => setSlotRequests((prev) => prev.filter((r) => r.status !== "PENDING"));
    socket.on("slot_request:status", onStatus);
    socket.on("slot_request:new", onNew);
    socket.on("slot_request:updated", onUpdated);
    socket.on("slot_request:cleared", onCleared);
    return () => {
      socket.off("slot_request:status", onStatus);
      socket.off("slot_request:new", onNew);
      socket.off("slot_request:updated", onUpdated);
      socket.off("slot_request:cleared", onCleared);
    };
  }, []);

  async function handleOpenRequests() {
    setSrLoading(true);
    try { await slotRequestApi.open(); setRequestsOpen(true); } catch { /* ignore */ } finally { setSrLoading(false); }
  }

  async function handleCloseRequests() {
    setSrLoading(true);
    try { await slotRequestApi.close(); setRequestsOpen(false); } catch { /* ignore */ } finally { setSrLoading(false); }
  }

  function handleAddFromRequest(req: SlotRequest) {
    setAddFromRequest({ requestId: req.id, slotName: req.slotName });
    setShowAddBonus(true);
  }

  async function handleRejectRequest(id: string) {
    try {
      await slotRequestApi.markRejected(id);
      setSlotRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "REJECTED" } : r));
    } catch { /* ignore */ }
  }

  async function handleClearPending() {
    try {
      await slotRequestApi.clearPending();
      setSlotRequests((prev) => prev.filter((r) => r.status !== "PENDING"));
    } catch { /* ignore */ }
  }

  async function handleClearAll() {
    try {
      await slotRequestApi.clearAll();
      setSlotRequests([]);
    } catch { /* ignore */ }
  }

  async function handleGoLive() {
    if (!hunt) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLiveLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.LIVE_HUNT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(hunt),
      });
      if (res.ok) setIsLive(true);
    } catch { /* ignore */ } finally { setLiveLoading(false); }
  }

  async function handleTakeDown() {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLiveLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.LIVE_HUNT, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIsLive(false);
    } catch { /* ignore */ } finally { setLiveLoading(false); }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === "b" || e.key === "B") && !showAddBonus && !editBonus && !openBonus && !deleteBonus
        && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShowAddBonus(true);
      }
      if ((e.key === "s" || e.key === "S") && hunt && !hunt.isStarted && !showAddBonus && !editBonus && !openBonus
        && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        handleStart();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  function mutateHunt(updater: (h: Hunt) => Hunt) {
    if (!hunt) return;
    const updated = updater(hunt);
    upsertHunt(updated);
    setHunt(updated);
    // If this hunt is currently live, push the update automatically
    if (isLive) {
      const token = localStorage.getItem("access_token");
      if (token) {
        fetch(API_ENDPOINTS.LIVE_HUNT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(updated),
        }).catch(() => {});
      }
    }
  }

  function handleStart() {
    if (!hunt) return;
    mutateHunt((h) => ({ ...h, isStarted: true }));
    const firstIdx = hunt.bonuses.findIndex((b) => b.payout === null);
    const idx = firstIdx >= 0 ? firstIdx : 0;
    setCurrentIdx(idx);
    const b = hunt.bonuses[idx];
    setPayoutInput(b?.payout != null ? b.payout.toString() : "");
    setNoteInput(b?.note ?? "");
    setOpeningMode(true);
  }

  async function handleEndHunt() {
    if (!hunt) return;
    mutateHunt((h) => ({ ...h, isCompleted: true }));
    setShowEndConfirm(false);
    setOpeningMode(false);
    // Take down live if needed
    if (isLive) {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (token) {
        await fetch(API_ENDPOINTS.LIVE_HUNT, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
        setIsLive(false);
      }
    }
  }

  function enterOpeningMode() {
    if (!hunt || hunt.bonuses.length === 0) return;
    const firstIdx = hunt.bonuses.findIndex((b) => b.payout === null);
    const idx = firstIdx >= 0 ? firstIdx : 0;
    setCurrentIdx(idx);
    const b = hunt.bonuses[idx];
    setPayoutInput(b?.payout != null ? b.payout.toString() : "");
    setNoteInput(b?.note ?? "");
    setOpeningMode(true);
  }

  function handleContinue() {
    if (!hunt) return;
    const bonus = hunt.bonuses[currentIdx];
    if (!bonus) return;
    const payout = parseFloat(payoutInput);
    if (!isNaN(payout) && payout >= 0) {
      mutateHunt((h) => ({
        ...h,
        bonuses: h.bonuses.map((b) =>
          b.id === bonus.id ? { ...b, payout, note: noteInput.trim() || b.note } : b
        ),
      }));
    }
    const next = currentIdx + 1;
    if (next >= hunt.bonuses.length) {
      setOpeningMode(false);
    } else {
      const nb = hunt.bonuses[next];
      setCurrentIdx(next);
      setPayoutInput(nb?.payout != null ? nb.payout.toString() : "");
      setNoteInput(nb?.note ?? "");
    }
  }

  function handleSaveBonus(bonus: HuntBonus) {
    mutateHunt((h) => {
      const idx = h.bonuses.findIndex((b) => b.id === bonus.id);
      const bonuses = idx >= 0
        ? h.bonuses.map((b) => b.id === bonus.id ? bonus : b)
        : [...h.bonuses, bonus];
      return { ...h, bonuses };
    });
    if (addFromRequest) {
      slotRequestApi.markAdded(addFromRequest.requestId)
        .then(() => setSlotRequests((prev) => prev.map((r) => r.id === addFromRequest.requestId ? { ...r, status: "ADDED" } : r)))
        .catch(() => {});
      setAddFromRequest(null);
    }
    setShowAddBonus(false);
    setEditBonus(null);
  }

  function handleOpenBonus(bonus: HuntBonus, payout: number) {
    mutateHunt((h) => ({
      ...h,
      bonuses: h.bonuses.map((b) => b.id === bonus.id ? { ...b, payout } : b),
    }));
    setOpenBonus(null);
  }

  function handleDeleteBonus(id: string) {
    mutateHunt((h) => ({ ...h, bonuses: h.bonuses.filter((b) => b.id !== id) }));
    setDeleteBonus(null);
  }

  function handleShuffle() {
    mutateHunt((h) => {
      const shuffled = [...h.bonuses].sort(() => Math.random() - 0.5);
      return { ...h, bonuses: shuffled };
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  if (!hunt) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Hunt not found.</p>
          <button onClick={() => router.push("/hunt-tracker")} className="text-gold-400 hover:text-gold-300 text-sm transition-colors">
            ← Back to tracker
          </button>
        </div>
      </div>
    );
  }

  const sym = CURRENCY_SYMBOLS[hunt.currency] ?? "$";
  const stats = calcHuntStats(hunt);

  /* filtered + sorted bonuses */
  const visibleBonuses = hunt.bonuses
    .filter((b) => b.slotName.toLowerCase().includes(searchGame.toLowerCase()) || b.provider.toLowerCase().includes(searchGame.toLowerCase()))
    .sort((a, b) => {
      let va = 0, vb = 0;
      if (sortKey === "date") { va = new Date(a.addedAt).getTime(); vb = new Date(b.addedAt).getTime(); }
      else if (sortKey === "betSize") { va = a.betSize; vb = b.betSize; }
      else if (sortKey === "payout") { va = a.payout ?? -1; vb = b.payout ?? -1; }
      else if (sortKey === "multi") {
        va = a.payout !== null && a.betSize > 0 ? a.payout / a.betSize : -1;
        vb = b.payout !== null && b.betSize > 0 ? b.payout / b.betSize : -1;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`flex items-center gap-1 text-xs uppercase tracking-widest font-semibold transition-colors ${active ? "text-gold-400" : "text-gray-600 hover:text-gray-400"}`}
      >
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
      </button>
    );
  }

  /* ── Opening mode ────────────────────────────────────────── */
  if (openingMode && hunt.isStarted) {
    const bonus = hunt.bonuses[currentIdx] ?? null;
    const openedBonuses = hunt.bonuses.filter((b) => b.payout !== null);
    const openedCount = openedBonuses.length;
    const winnings = openedBonuses.reduce((s, b) => s + (b.payout ?? 0), 0);
    const pnl = winnings - hunt.startCost;
    const remaining = hunt.bonuses.length - openedCount;
    const avgBet = hunt.bonuses.length > 0
      ? hunt.bonuses.reduce((s, b) => s + b.betSize, 0) / hunt.bonuses.length : 0;
    const openedAvgBet = openedCount > 0
      ? openedBonuses.reduce((s, b) => s + b.betSize, 0) / openedCount : avgBet;
    const runAvg = openedCount > 0 && openedAvgBet > 0 ? (winnings / openedCount) / openedAvgBet : 0;
    const reqAvg = avgBet > 0 ? hunt.startCost / (hunt.bonuses.length * avgBet) : 0;
    const cumX = hunt.startCost > 0 ? winnings / hunt.startCost : 0;
    const breakEven = Math.max(0, hunt.startCost - winnings);
    const liveMulti = payoutInput && parseFloat(payoutInput) >= 0 && bonus && bonus.betSize > 0
      ? parseFloat(payoutInput) / bonus.betSize : null;

    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Title */}
          <h1 className="text-white font-bold text-xl mb-5">
            {hunt.name} – {fmtDate(hunt.date)}
          </h1>

          {/* Stats row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            {[
              { label: "Progress",   value: `${currentIdx + 1}/${hunt.bonuses.length}` },
              { label: "Start Cost", value: `${sym}${hunt.startCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: "Winnings",   value: `${sym}${winnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: "P&L",        value: `${pnl >= 0 ? "+" : ""}${sym}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: pnl >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Remaining",  value: remaining.toString() },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className={`font-bold text-lg leading-tight ${color ?? "text-white"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Stats row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {[
              { label: "Run Avg",    value: `${runAvg.toFixed(2)}x` },
              { label: "Req Avg",    value: `${reqAvg.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x` },
              { label: "Cum. X",     value: `${cumX.toFixed(2)}x` },
              { label: "Break Even", value: `${sym}${breakEven.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: "Opened",     value: `${openedCount}/${hunt.bonuses.length}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className="text-white font-bold text-lg leading-tight">{value}</p>
              </div>
            ))}
          </div>

          {/* Back to Hunt / nav row */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setOpeningMode(false)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm"
            >
              <ChevronDown className="w-4 h-4 rotate-90" /> Back to Hunt
            </button>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {currentIdx > 0 && (
                <button
                  onClick={() => {
                    const prev = currentIdx - 1;
                    const pb = hunt.bonuses[prev];
                    setCurrentIdx(prev);
                    setPayoutInput(pb?.payout != null ? pb.payout.toString() : "");
                    setNoteInput(pb?.note ?? "");
                  }}
                  className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/5 transition-colors"
                >
                  ← Prev
                </button>
              )}
              {currentIdx < hunt.bonuses.length - 1 && (
                <button
                  onClick={() => {
                    const next = currentIdx + 1;
                    const nb = hunt.bonuses[next];
                    setCurrentIdx(next);
                    setPayoutInput(nb?.payout != null ? nb.payout.toString() : "");
                    setNoteInput(nb?.note ?? "");
                  }}
                  className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/5 transition-colors"
                >
                  Skip →
                </button>
              )}
            </div>
          </div>

          {/* Current bonus card */}
          {bonus ? (
            <motion.div
              key={bonus.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0f0c1e]/90 border border-white/10 rounded-2xl p-6"
            >
              {/* Bonus header */}
              <div className="flex items-center gap-4 mb-6">
                <SlotImg src={bonus.image} alt={bonus.slotName} size={14} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-lg">{bonus.slotName}</span>
                    <BadgePill badge={bonus.badge} custom={bonus.customBadge} />
                  </div>
                  <p className="text-gray-500 text-sm">Game {currentIdx + 1}/{hunt.bonuses.length}</p>
                </div>
              </div>

              {/* Three fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {/* Bet Size (read-only) */}
                <div>
                  <label className="text-gray-500 text-xs mb-2 block">Bet Size</label>
                  <div className="flex items-center gap-2 bg-[#1a1535] border border-white/8 rounded-xl px-4 py-3">
                    <span className="text-gray-500">{sym}</span>
                    <span className="text-gray-300 font-semibold">{bonus.betSize.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payout (editable) */}
                <div>
                  <label className="text-gray-500 text-xs mb-2 block">Payout</label>
                  <div className="flex items-center gap-2 bg-[#1a1535] border border-gold-500/50 rounded-xl px-4 py-3 focus-within:border-gold-400 transition-colors">
                    <span className="text-gray-500">{sym}</span>
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      step="0.01"
                      value={payoutInput}
                      onChange={(e) => setPayoutInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                {/* Multiplier (auto-calculated) */}
                <div>
                  <label className="text-gray-500 text-xs mb-2 block">Multiplier</label>
                  <div className="flex items-center gap-2 bg-[#1a1535] border border-white/8 rounded-xl px-4 py-3">
                    <X className="w-4 h-4 text-gray-600" />
                    <span className={`font-bold ${liveMulti !== null ? (liveMulti >= reqAvg ? "text-emerald-400" : "text-red-400") : "text-gray-600"}`}>
                      {liveMulti !== null ? `${liveMulti.toFixed(2)}x` : "0x"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="text-gray-500 text-xs mb-2 block">Notes</label>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Type a note..."
                  rows={2}
                  className="w-full bg-[#1a1535] border border-white/8 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setOpeningMode(false)}
                  className="bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-[#0a0810] font-bold px-8 py-2.5 rounded-xl transition-colors text-sm"
                >
                  {currentIdx < hunt.bonuses.length - 1 ? "Continue" : "Finish"}
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#0f0c1e]/90 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-emerald-400 font-bold text-lg mb-2">All bonuses opened!</p>
              <p className="text-gray-500 text-sm mb-6">
                Final P&L: <span className={pnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {pnl >= 0 ? "+" : ""}{sym}{Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
              <button
                onClick={() => setOpeningMode(false)}
                className="bg-gold-500 hover:bg-gold-400 text-[#0a0810] font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Back to Hunt
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <button
              onClick={() => router.push("/hunt-tracker")}
              className="flex items-center gap-2 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-white font-bold text-xl flex-1">
              {hunt.name} – {fmtDate(hunt.date)}
            </h1>
            <div className="flex items-center gap-2">
              {/* OBS widget button */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/bonus-hunt-widget`;
                  navigator.clipboard.writeText(url).catch(() => {});
                  window.open(url, "_blank");
                }}
                title="Open OBS widget (also copies URL)"
                className="flex items-center gap-1.5 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-400 hover:text-white font-semibold px-3 py-1.5 rounded-xl transition-colors text-xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                OBS
              </button>

              {isLive ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                  </span>
                  <button
                    onClick={handleTakeDown}
                    disabled={liveLoading}
                    className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-semibold px-3 py-1.5 rounded-xl transition-colors text-xs disabled:opacity-50"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Take Down
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoLive}
                  disabled={liveLoading}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  <Radio className="w-4 h-4" /> {liveLoading ? "Publishing…" : "Go Live"}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stats row 1 ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <StatBox label="Bonuses" value={stats.bonusCount.toString()} />
          <StatBox label="Start Cost" value={`${sym}${stats.startCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <StatBox label="Winnings" value={`${sym}${stats.winnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <StatBox
            label="Profit/Loss"
            value={`${stats.profitLoss >= 0 ? "+" : ""}${sym}${Math.abs(stats.profitLoss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
        </div>

        {/* ── Stats row 2 ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <StatBox label="Avg Req" value={`${sym}${stats.avgReq.toFixed(2)}`} />
          <StatBox label="Cur Avg" value={`${sym}${stats.curAvg.toFixed(2)}`} />
          <StatBox label="Total X" value={fmtMulti(stats.totalX)} />
          <StatBox label="Req X" value={fmtMulti(stats.reqX)} />
          <StatBox label="Cur Avg X" value={fmtMulti(stats.curAvgX)} />
        </div>

        {/* ── Pace Analysis accordion ─────────────────────────── */}
        <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl mb-6 overflow-hidden">
          <button
            onClick={() => setShowPace((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-gray-500 hover:text-gray-300 transition-colors text-xs uppercase tracking-widest font-semibold"
          >
            Pace Analysis
            {showPace ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showPace && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(() => {
                    const opened = hunt.bonuses.filter((b) => b.payout !== null);
                    const remaining = hunt.bonuses.length - opened.length;
                    const currentWinnings = opened.reduce((s, b) => s + (b.payout ?? 0), 0);
                    const neededPerBonus = remaining > 0 ? Math.max(0, hunt.startCost - currentWinnings) / remaining : 0;
                    const openedPct = hunt.bonuses.length > 0 ? (opened.length / hunt.bonuses.length) * 100 : 0;
                    return [
                      { label: "Opened", value: `${opened.length} / ${hunt.bonuses.length}` },
                      { label: "Remaining", value: remaining.toString() },
                      { label: "Progress", value: `${openedPct.toFixed(0)}%` },
                      { label: "Needed / Bonus", value: `${sym}${neededPerBonus.toFixed(2)}` },
                    ];
                  })().map((item) => (
                    <div key={item.label} className="bg-[#1a1535] border border-white/8 rounded-xl p-3 text-center">
                      <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                      <p className="text-white font-bold text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Controls ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              value={searchGame}
              onChange={(e) => setSearchGame(e.target.value)}
              placeholder="Search for a game…"
              className="w-full bg-[#14102a] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>
          <button
            onClick={() => toggleSort("betSize")}
            className="flex items-center gap-1.5 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-400 text-sm px-3 py-2.5 rounded-xl transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Bet Size
          </button>
          <button
            onClick={() => toggleSort("date")}
            className="flex items-center gap-1.5 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-400 text-sm px-3 py-2.5 rounded-xl transition-colors"
          >
            Date
          </button>
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-400 text-sm px-3 py-2.5 rounded-xl transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" /> Shuffle
          </button>
          {!hunt.isCompleted && (
            <button
              disabled={hunt.isStarted && hunt.isCompleted}
              onClick={hunt.isStarted ? enterOpeningMode : handleStart}
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0810] font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Play className="w-4 h-4" fill="#0a0810" />
              {hunt.isStarted ? "Resume" : "Start"}
              {!hunt.isStarted && <kbd className="bg-gold-600 text-[#0a0810] text-[10px] px-1.5 py-0.5 rounded font-mono">S</kbd>}
            </button>
          )}
          {hunt.isStarted && !hunt.isCompleted && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              End Hunt
            </button>
          )}
          {hunt.isCompleted && (
            <span className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> COMPLETED
            </span>
          )}
        </div>

        {/* ── Slot Requests panel (admin only) ────────────────── */}
        {isAdmin && (
          <div className="mb-4 bg-[#14102a]/80 border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold text-sm">Slot Requests</span>
                {requestsOpen && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open
                  </span>
                )}
                {!requestsOpen && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                    Closed
                  </span>
                )}
                {slotRequests.filter((r) => r.status === "PENDING").length > 0 && (
                  <span className="text-[10px] font-bold text-white bg-gold-500 px-2 py-0.5 rounded-full">
                    {slotRequests.filter((r) => r.status === "PENDING").length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {slotRequests.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                  >
                    Clear all
                  </button>
                )}
                {requestsOpen ? (
                  <button
                    onClick={handleCloseRequests}
                    disabled={srLoading}
                    className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Close Requests
                  </button>
                ) : (
                  <button
                    onClick={handleOpenRequests}
                    disabled={srLoading}
                    className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Open Requests
                  </button>
                )}
              </div>
            </div>

            {slotRequests.length > 0 && (
              <div className="border-t border-white/6 divide-y divide-white/5 max-h-72 overflow-y-auto">
                {slotRequests.map((req) => {
                  const game = SLOT_GAMES.find((g) => g.name.toLowerCase() === req.slotName.toLowerCase())
                    ?? SLOT_GAMES.find((g) => g.name.toLowerCase().includes(req.slotName.toLowerCase()));
                  return (
                    <div key={req.id} className={`flex items-center gap-3 px-5 py-3 ${req.status !== "PENDING" ? "opacity-40" : ""}`}>
                      {game ? (
                        <SlotImg src={game.image} alt={game.name} size={8} />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#1a1535] border border-white/8 flex items-center justify-center shrink-0">
                          <ImageOff className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{game ? game.name : req.slotName}</p>
                        {game && game.name.toLowerCase() !== req.slotName.toLowerCase() && (
                          <p className="text-gray-600 text-[10px] truncate">"{req.slotName}"</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          {game && <span className="text-gray-600 text-xs">{game.provider}</span>}
                          {game && <span className="text-gray-700 text-xs">·</span>}
                          <span className="text-xs text-gold-400 font-semibold">{req.kickUsername}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {req.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleAddFromRequest(req)}
                              className="text-xs font-semibold bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-400 px-3 py-1 rounded-lg transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {req.status === "ADDED" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Added</span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Rejected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {slotRequests.length === 0 && (
              <div className="px-5 pb-4 text-gray-600 text-xs">
                {requestsOpen ? "No requests yet — viewers can type !sr <slot name> in chat." : "Open requests to let viewers suggest slots via !sr in chat."}
              </div>
            )}
          </div>
        )}

        {/* ── Add Bonus area ──────────────────────────────────── */}
        <button
          onClick={() => setShowAddBonus(true)}
          className="w-full border-2 border-dashed border-white/10 hover:border-gold-500/50 rounded-2xl py-6 text-gray-600 hover:text-gold-400 transition-colors flex items-center justify-center gap-2 text-sm font-semibold mb-4"
        >
          <Plus className="w-5 h-5" /> Add Bonus
          <kbd className="bg-[#1a1535] text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-mono">B</kbd>
        </button>

        {/* ── Bonuses table ───────────────────────────────────── */}
        <div className="bg-[#0f0c1e]/80 border border-white/8 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_140px_100px_100px_90px_80px] px-5 py-3 border-b border-white/6">
            <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold flex items-center gap-1">
              Game
            </span>
            <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Provider</span>
            <button className="text-left" onClick={() => toggleSort("betSize")}>
              <span className={`text-xs uppercase tracking-widest font-semibold flex items-center gap-1 ${sortKey === "betSize" ? "text-gold-400" : "text-gray-600"}`}>
                Bet Size {sortKey === "betSize" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
              </span>
            </button>
            <button className="text-left" onClick={() => toggleSort("payout")}>
              <span className={`text-xs uppercase tracking-widest font-semibold flex items-center gap-1 ${sortKey === "payout" ? "text-gold-400" : "text-gray-600"}`}>
                Payout {sortKey === "payout" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
              </span>
            </button>
            <button className="text-left" onClick={() => toggleSort("multi")}>
              <span className={`text-xs uppercase tracking-widest font-semibold flex items-center gap-1 ${sortKey === "multi" ? "text-gold-400" : "text-gray-600"}`}>
                Multi {sortKey === "multi" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
              </span>
            </button>
            <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold text-right">Actions</span>
          </div>

          {visibleBonuses.length === 0 ? (
            <div className="py-16 text-center">
              <ImageOff className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">
                {searchGame ? "No bonuses match your search." : "No bonuses yet. Add your first one!"}
              </p>
            </div>
          ) : (
            visibleBonuses.map((bonus, i) => {
              const multi = bonus.payout !== null && bonus.betSize > 0
                ? bonus.payout / bonus.betSize : null;

              return (
                <motion.div
                  key={bonus.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_100px_100px_90px_80px] items-center px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Game */}
                  <div className="flex items-center gap-3 min-w-0">
                    <SlotImg src={bonus.image} alt={bonus.slotName} size={10} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm truncate">{bonus.slotName}</span>
                        <BadgePill badge={bonus.badge} custom={bonus.customBadge} />
                      </div>
                      {bonus.note && <p className="text-gray-600 text-xs truncate mt-0.5">{bonus.note}</p>}
                    </div>
                  </div>

                  {/* Provider */}
                  <span className="hidden sm:block text-gray-400 text-sm truncate">{bonus.provider}</span>

                  {/* Bet */}
                  <span className="hidden sm:block text-gray-300 text-sm">{sym}{bonus.betSize.toFixed(2)}</span>

                  {/* Payout */}
                  <span className={`hidden sm:block text-sm font-semibold ${bonus.payout !== null ? "text-white" : "text-gray-600"}`}>
                    {bonus.payout !== null ? `${sym}${bonus.payout.toFixed(2)}` : "–"}
                  </span>

                  {/* Multi */}
                  <span className={`hidden sm:block text-sm font-bold ${multi !== null ? (multi >= stats.reqX ? "text-emerald-400" : "text-red-400") : "text-gray-600"}`}>
                    {multi !== null ? `${multi.toFixed(2)}x` : "0.00x"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setDeleteBonus(bonus)}
                      className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditBonus(bonus)}
                      className="p-1.5 text-gray-600 hover:text-gold-400 rounded-lg hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setOpenBonus(bonus)}
                      disabled={bonus.payout !== null && !hunt.isStarted}
                      className="p-1.5 text-gray-600 hover:text-emerald-400 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Open bonus (enter payout)"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showAddBonus || editBonus) && (
          <AddBonusModal
            initial={editBonus}
            currency={hunt.currency}
            prefillSlotName={addFromRequest?.slotName}
            onClose={() => { setShowAddBonus(false); setEditBonus(null); setAddFromRequest(null); }}
            onSave={handleSaveBonus}
          />
        )}
        {openBonus && (
          <OpenBonusModal
            bonus={openBonus}
            currency={hunt.currency}
            onClose={() => setOpenBonus(null)}
            onSave={(p) => handleOpenBonus(openBonus, p)}
          />
        )}
        {deleteBonus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteBonus(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-[#0f0c1e] border border-white/10 rounded-2xl w-full max-w-sm p-7 z-10 text-center"
            >
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">Remove Bonus</h3>
              <p className="text-gray-400 text-sm mb-6">Remove <span className="text-white font-semibold">{deleteBonus.slotName}</span> from this hunt?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteBonus(null)} className="flex-1 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                <button onClick={() => handleDeleteBonus(deleteBonus.id)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">Remove</button>
              </div>
            </motion.div>
          </div>
        )}
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-[#0f0c1e] border border-white/10 rounded-2xl w-full max-w-sm p-7 z-10 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <Play className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">End Hunt?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This will mark the hunt as <span className="text-white font-semibold">completed</span> and take it down from the live viewer. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 bg-[#1a1535] hover:bg-[#211a45] border border-white/10 text-gray-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
                <button onClick={handleEndHunt} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">End Hunt</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
