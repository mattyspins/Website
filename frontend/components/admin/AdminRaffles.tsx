"use client";

import { useEffect, useState, useCallback } from "react";
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
  status: string;
  endsAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-green-500/20 text-green-300 border border-green-500/30",
  completed: "bg-white/5 text-white/40 border border-white/10",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
}

export default function AdminRaffles() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const loadRaffles = useCallback(async () => {
    try {
      const url = filter === "all" ? API_ENDPOINTS.RAFFLES_ADMIN_ALL : API_ENDPOINTS.RAFFLES_ACTIVE;
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      setRaffles(data.data?.raffles ?? data.raffles ?? []);
    } catch {
      setError("Failed to load raffles");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadRaffles(); }, [loadRaffles]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const selectWinners = async (raffle: Raffle) => {
    if (!confirm(`Select ${raffle.numberOfWinners} winner(s) for "${raffle.title}"?`)) return;
    setActionLoading(raffle.id + ":winners");
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLES_SELECT_WINNERS(raffle.id), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to select winners"); return; }
      const names = (data.data?.winners ?? [])
        .map((w: any, i: number) => `${i + 1}. ${w.displayName ?? w.userId}`)
        .join("\n");
      flash(`Winners selected!\n${names}`);
      loadRaffles();
    } catch {
      setError("Failed to select winners");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelRaffle = async (raffle: Raffle) => {
    if (!confirm(`Cancel raffle "${raffle.title}"? This cannot be undone.`)) return;
    setActionLoading(raffle.id + ":cancel");
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE_CANCEL(raffle.id), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: "Cancelled by admin" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to cancel raffle"); return; }
      flash(`Raffle "${raffle.title}" cancelled.`);
      loadRaffles();
    } catch {
      setError("Failed to cancel raffle");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Raffle Management</h2>
          <div className="flex gap-1 mt-2">
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                  filter === f ? "bg-yellow-400 text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                }`}
              >
                {f === "active" ? "Active" : "All Raffles"}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm"
        >
          + Create Raffle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm whitespace-pre-line">{successMsg}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      ) : raffles.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <p className="text-4xl mb-3">🎟️</p>
          <p>No {filter === "active" ? "active" : ""} raffles yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {raffles.map((raffle) => {
            const pct = raffle.maxTickets > 0 ? Math.min(100, (raffle.ticketsSold / raffle.maxTickets) * 100) : 0;
            const isActing = actionLoading?.startsWith(raffle.id);
            return (
              <div key={raffle.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate">{raffle.title}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[raffle.status] ?? STATUS_STYLE.completed}`}>
                        {raffle.status}
                      </span>
                    </div>
                    {raffle.description && <p className="text-white/40 text-xs mb-2">{raffle.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-white/50">
                      <span className="text-yellow-400 font-medium">🎁 {raffle.prize}</span>
                      <span>💎 {raffle.ticketPrice} coins/ticket</span>
                      <span>🏆 {raffle.numberOfWinners} winner{raffle.numberOfWinners > 1 ? "s" : ""}</span>
                      <span>📅 Ends {new Date(raffle.endsAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Tickets sold</span>
                    <span className="font-semibold text-white">{raffle.ticketsSold} / {raffle.maxTickets}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Actions */}
                {raffle.status === "active" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectWinners(raffle)}
                      disabled={!!isActing || raffle.ticketsSold === 0}
                      className="px-3 py-1.5 bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/25 disabled:opacity-40 text-xs font-semibold transition-colors"
                    >
                      {actionLoading === raffle.id + ":winners" ? "Selecting…" : `🎲 Select ${raffle.numberOfWinners} Winner${raffle.numberOfWinners > 1 ? "s" : ""}`}
                    </button>
                    <button
                      onClick={() => cancelRaffle(raffle)}
                      disabled={!!isActing}
                      className="px-3 py-1.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 text-xs font-semibold transition-colors"
                    >
                      {actionLoading === raffle.id + ":cancel" ? "Cancelling…" : "✕ Cancel Raffle"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateRaffleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); flash("Raffle created!"); loadRaffles(); }}
        />
      )}
    </div>
  );
}

function CreateRaffleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", prize: "",
    ticketPrice: "100", maxTickets: "100",
    numberOfWinners: "1", maxEntriesPerUser: "-1", endDate: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLES_CREATE, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          prize: form.prize,
          ticketPrice: parseInt(form.ticketPrice),
          maxTickets: parseInt(form.maxTickets),
          numberOfWinners: parseInt(form.numberOfWinners),
          maxEntriesPerUser: parseInt(form.maxEntriesPerUser),
          endDate: form.endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to create raffle"); return; }
      onCreated();
    } catch {
      setError("Failed to create raffle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <h3 className="text-lg font-bold text-white">Create Raffle</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg">✕</button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {[
            { label: "Title", key: "title", placeholder: "e.g., Weekly Giveaway", required: true },
            { label: "Description (optional)", key: "description", placeholder: "e.g., Win amazing prizes!" },
            { label: "Prize", key: "prize", placeholder: "e.g., 10,000 Coins", required: true },
          ].map(({ label, key, placeholder, required }) => (
            <div key={key}>
              <label className="block text-sm text-white/60 mb-1">{label}</label>
              <input
                type="text"
                value={form[key as keyof typeof form]}
                onChange={set(key as keyof typeof form)}
                placeholder={placeholder}
                required={required}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Ticket Price (coins)</label>
              <input type="number" min="1" value={form.ticketPrice} onChange={set("ticketPrice")} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Max Tickets</label>
              <input type="number" min="1" value={form.maxTickets} onChange={set("maxTickets")} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Number of Winners</label>
              <input type="number" min="1" value={form.numberOfWinners} onChange={set("numberOfWinners")} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Max Entries/User</label>
              <input type="number" min="-1" value={form.maxEntriesPerUser} onChange={set("maxEntriesPerUser")} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
              <p className="text-[11px] text-white/25 mt-1">-1 = unlimited</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">End Date & Time</label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={set("endDate")}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 [color-scheme:dark]"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-white/8 flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors text-sm"
          >
            {loading ? "Creating…" : "Create Raffle"}
          </button>
          <button onClick={onClose} className="px-4 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
