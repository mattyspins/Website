"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

interface Raffle {
  id: string;
  title: string;
  description?: string;
  prize: string;
  ticketPrice: number;
  maxTickets: number;
  maxEntriesPerUser: number;
  numberOfWinners: number;
  ticketsSold: number;
  status: "active" | "ended" | "cancelled";
  endsAt: string;
  isFeatured?: boolean;
}

interface RaffleWinner {
  id: string;
  userId: string;
  position: number;
  prizeDescription?: string;
  selectedAt: string;
  displayName?: string;
  avatarUrl?: string | null;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ─── Create Modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: Raffle) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prize: "",
    ticketPrice: 100,
    maxTickets: 100,
    numberOfWinners: 1,
    maxEntriesPerUser: -1,
    durationMs: 7 * 86400 * 1000, // stored in ms for uniform handling
    customEndDate: "",
    useCustomEnd: false,
  });
  const [customTicketPrice, setCustomTicketPrice] = useState("");
  const [customMaxTickets, setCustomMaxTickets] = useState("");
  const [customWinners, setCustomWinners] = useState("");
  const [customMaxEntries, setCustomMaxEntries] = useState("");

  const submit = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    if (!form.prize.trim()) { setError("Prize required"); return; }
    setLoading(true);
    setError(null);
    try {
      const endDate = form.useCustomEnd && form.customEndDate
        ? new Date(form.customEndDate).toISOString()
        : new Date(Date.now() + form.durationMs).toISOString();
      const res = await fetch(API_ENDPOINTS.RAFFLES_CREATE, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          prize: form.prize,
          ticketPrice: form.ticketPrice,
          maxTickets: form.maxTickets,
          numberOfWinners: form.numberOfWinners,
          maxEntriesPerUser: form.maxEntriesPerUser,
          endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to create raffle"); return; }
      onCreate(data.data ?? data);
    } catch {
      setError("Failed to create raffle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-navy-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 pt-5 pb-4 border-b border-white/8">
          <h3 className="text-lg font-semibold text-white">Create Raffle</h3>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Title */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Weekly Giveaway"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          {/* Prize */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Prize</label>
            <input
              value={form.prize}
              onChange={(e) => setForm({ ...form, prize: e.target.value })}
              placeholder="e.g. $50 Gift Card"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-yellow-400/50 mb-2"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-white/40 shrink-0">Coins:</span>
              {[100, 250, 500, 1000, 2500].map((v) => (
                <button key={v} type="button"
                  onClick={() => setForm({ ...form, prize: `${v} coins` })}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                    form.prize === `${v} coins`
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Description <span className="text-white/25">(optional)</span></label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Enter for a chance to win!"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          {/* Ticket Price */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Ticket Price (coins)</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[50, 100, 250, 500].map((v) => (
                <button key={v} type="button"
                  onClick={() => { setForm({ ...form, ticketPrice: v }); setCustomTicketPrice(""); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    form.ticketPrice === v && !customTicketPrice
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 shrink-0">Custom:</span>
              <input
                type="number" min="1" placeholder="coins"
                value={customTicketPrice}
                onChange={(e) => { setCustomTicketPrice(e.target.value); if (e.target.value) setForm({ ...form, ticketPrice: parseInt(e.target.value) || 100 }); }}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
              />
            </div>
          </div>

          {/* Max Tickets */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Max Tickets</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[50, 100, 250, 500].map((v) => (
                <button key={v} type="button"
                  onClick={() => { setForm({ ...form, maxTickets: v }); setCustomMaxTickets(""); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    form.maxTickets === v && !customMaxTickets
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 shrink-0">Custom:</span>
              <input
                type="number" min="1" placeholder="tickets"
                value={customMaxTickets}
                onChange={(e) => { setCustomMaxTickets(e.target.value); if (e.target.value) setForm({ ...form, maxTickets: parseInt(e.target.value) || 100 }); }}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Duration</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: "5 Min",   value: 5 * 60 * 1000 },
                { label: "10 Min",  value: 10 * 60 * 1000 },
                { label: "1 Day",   value: 1 * 86400 * 1000 },
                { label: "3 Days",  value: 3 * 86400 * 1000 },
                { label: "7 Days",  value: 7 * 86400 * 1000 },
                { label: "14 Days", value: 14 * 86400 * 1000 },
              ].map(({ label, value }) => (
                <button key={value} type="button"
                  onClick={() => setForm({ ...form, durationMs: value, useCustomEnd: false })}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    form.durationMs === value && !form.useCustomEnd
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 shrink-0">Custom:</span>
              <input
                type="datetime-local"
                value={form.customEndDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setForm({ ...form, customEndDate: e.target.value, useCustomEnd: !!e.target.value })}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Winners */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Number of Winners</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 2, 3, 5].map((v) => (
                <button key={v} type="button"
                  onClick={() => { setForm({ ...form, numberOfWinners: v }); setCustomWinners(""); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    form.numberOfWinners === v && !customWinners
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 shrink-0">Custom:</span>
              <input
                type="number" min="1" placeholder="winners"
                value={customWinners}
                onChange={(e) => { setCustomWinners(e.target.value); if (e.target.value) setForm({ ...form, numberOfWinners: parseInt(e.target.value) || 1 }); }}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
              />
            </div>
          </div>

          {/* Max entries per user */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Max Tickets Per User</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[{ label: "∞ Unlimited", value: -1 }, { label: "1", value: 1 }, { label: "3", value: 3 }, { label: "5", value: 5 }].map(({ label, value }) => (
                <button key={value} type="button"
                  onClick={() => { setForm({ ...form, maxEntriesPerUser: value }); setCustomMaxEntries(""); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    form.maxEntriesPerUser === value && !customMaxEntries
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 shrink-0">Custom:</span>
              <input
                type="number" min="1" placeholder="max per user"
                value={customMaxEntries}
                onChange={(e) => { setCustomMaxEntries(e.target.value); if (e.target.value) setForm({ ...form, maxEntriesPerUser: parseInt(e.target.value) || 1 }); }}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 [appearance:textfield]"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors"
          >
            {loading ? "Creating…" : "Create Raffle"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminRafflePage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selected, setSelected] = useState<Raffle | null>(null);
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user?.isAdmin) router.push("/");
        else setAuthLoading(false);
      })
      .catch(() => router.push("/"));
  }, []);

  const loadRaffles = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLES_ADMIN_ALL, { headers: authHeaders() });
      const data = await res.json();
      const list: Raffle[] = data.data?.raffles ?? data.raffles ?? [];
      setRaffles(list);
      if (!selected && list.length > 0) setSelected(list[0]);
    } catch {
      setError("Failed to load raffles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRaffles(); }, [loadRaffles]);

  const loadWinners = useCallback(async (raffleId: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE_WINNERS(raffleId), { headers: authHeaders() });
      const data = await res.json();
      setWinners(data.data?.winners ?? data.winners ?? []);
    } catch {
      setWinners([]);
    }
  }, []);

  useEffect(() => {
    if (selected?.status === "ended") loadWinners(selected.id);
    else setWinners([]);
  }, [selected?.id, selected?.status]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleSelectWinners = async () => {
    if (!selected) return;
    if (!confirm(`Draw ${selected.numberOfWinners} winner(s) for "${selected.title}"?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE_SELECT_WINNERS(selected.id), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to select winners"); return; }
      flash("Winners drawn!");
      await loadRaffles();
      const updated = { ...selected, status: "ended" as const };
      setSelected(updated);
    } catch {
      setError("Failed to select winners");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    if (!confirm(`Cancel "${selected.title}"? Tickets will be refunded.`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE_CANCEL(selected.id), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: "Cancelled by admin" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to cancel"); return; }
      flash(`Raffle cancelled. All tickets refunded.`);
      loadRaffles();
    } catch {
      setError("Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" permanently?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE(id), { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); setError(d.error?.message || "Failed to delete"); return; }
      const remaining = raffles.filter((r) => r.id !== id);
      setRaffles(remaining);
      setSelected(remaining[0] ?? null);
    } catch {
      setError("Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const STATUS_COLOR: Record<string, string> = {
    active:    "bg-green-500/20 text-green-400 border-green-500/30",
    ended:     "bg-white/5 text-white/30 border-white/10",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th"];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const ticketPct = selected && selected.maxTickets > 0
    ? Math.min(100, (selected.ticketsSold / selected.maxTickets) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Raffle Admin</h1>
            <p className="text-white/40 text-sm mt-0.5">Create and manage viewer raffles</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm"
          >
            + New Raffle
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">{successMsg}</div>
        )}

        {/* Raffle list — vertical cards */}
        <div className="space-y-2 mb-6">
          {raffles.map((r) => {
            const isActive = selected?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className={`cursor-pointer rounded-xl border transition-all duration-200 ${
                  isActive ? "border-yellow-400/40 bg-yellow-400/5" : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      r.status === "active" ? "bg-green-400 animate-pulse" : "bg-white/20"
                    }`} />
                    <span className="font-semibold text-white text-sm truncate max-w-[200px]">{r.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[r.status] ?? STATUS_COLOR.ended}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/35">
                    <span className="text-yellow-400/70 font-medium truncate max-w-[120px]">🎁 {r.prize}</span>
                    <span>{r.ticketsSold}/{r.maxTickets} tickets</span>
                    {isActive && <span className="text-yellow-400 text-sm">▾</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id, r.title); }}
                      disabled={actionLoading}
                      className="ml-1 px-2 py-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-30 text-base"
                      title="Delete raffle"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected raffle detail */}
        {selected && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                  {selected.description && (
                    <p className="text-white/40 text-sm mt-0.5">{selected.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-white/50 mt-2">
                    <span className="text-yellow-400 font-medium">🎁 {selected.prize}</span>
                    <span>💎 {selected.ticketPrice} coins/ticket</span>
                    <span>🏆 {selected.numberOfWinners} winner{selected.numberOfWinners !== 1 ? "s" : ""}</span>
                    <span>{selected.maxEntriesPerUser === -1 ? "∞ unlimited/user" : `max ${selected.maxEntriesPerUser}/user`}</span>
                    <span>📅 {new Date(selected.endsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {selected.status === "active" && (
                    <>
                      <button
                        onClick={handleSelectWinners}
                        disabled={actionLoading || selected.ticketsSold === 0}
                        className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors text-sm"
                      >
                        🎲 Draw {selected.numberOfWinners} Winner{selected.numberOfWinners !== 1 ? "s" : ""}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={actionLoading}
                        className="px-4 py-2 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tickets progress */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                  <span>Tickets sold</span>
                  <span className="font-semibold text-white">{selected.ticketsSold} / {selected.maxTickets}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${ticketPct}%` }}
                  />
                </div>
                {selected.ticketsSold === 0 && selected.status === "active" && (
                  <p className="text-xs text-white/25 mt-1.5">No tickets sold yet — Draw Winners is disabled until at least 1 ticket is sold.</p>
                )}
              </div>
            </div>

            {/* Winners display (ended raffles) */}
            {selected.status === "ended" && (
              <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-400/25 rounded-2xl p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none" />
                <div className="text-5xl mb-3 text-center drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">🎉</div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400/70 mb-4 text-center">Winners Drawn</p>

                {winners.length === 0 ? (
                  <p className="text-white/30 text-sm text-center">Loading winners…</p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-6">
                    {winners
                      .sort((a, b) => a.position - b.position)
                      .map((w) => (
                        <div key={w.id} className="flex flex-col items-center gap-2">
                          {w.avatarUrl ? (
                            <img
                              src={w.avatarUrl}
                              alt=""
                              className={`rounded-full ring-2 shadow-[0_0_16px_rgba(250,204,21,0.3)] ${
                                w.position === 1 ? "w-14 h-14 ring-yellow-400/60" : "w-11 h-11 ring-white/30"
                              }`}
                            />
                          ) : (
                            <div className={`rounded-full flex items-center justify-center font-bold ring-2 ${
                              w.position === 1
                                ? "w-14 h-14 bg-yellow-400/20 text-yellow-300 ring-yellow-400/60 text-xl"
                                : "w-11 h-11 bg-white/10 text-white/50 ring-white/20 text-base"
                            }`}>
                              {(w.displayName ?? "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="text-center">
                            <p className={`font-bold ${w.position === 1 ? "text-white text-base" : "text-white/80 text-sm"}`}>
                              {w.displayName ?? "Unknown"}
                            </p>
                            <p className="text-[10px] text-yellow-400/60 font-bold uppercase tracking-wide">
                              {ORDINAL[w.position] ?? `#${w.position}`} Place
                            </p>
                            {w.prizeDescription && (
                              <p className="text-[11px] text-white/35 mt-0.5">{w.prizeDescription}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Cancelled notice */}
            {selected.status === "cancelled" && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">❌</div>
                <p className="text-red-400 font-semibold">This raffle was cancelled</p>
                <p className="text-white/30 text-sm mt-1">All tickets were refunded to buyers.</p>
              </div>
            )}
          </div>
        )}

        {raffles.length === 0 && !loading && (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-3">🎟️</div>
            <p className="text-lg">No raffles yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm"
            >
              Create First Raffle
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(r) => {
            setRaffles((prev) => [r, ...prev]);
            setSelected(r);
            setShowCreate(false);
            flash("Raffle created!");
          }}
        />
      )}
    </div>
  );
}
