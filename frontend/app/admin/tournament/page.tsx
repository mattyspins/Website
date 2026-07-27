"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, TournamentStatus, TournamentMatch } from "@/types/tournament";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/ui/ToastProvider";
import SetupPanel from "@/components/admin/tournament/SetupPanel";
import RegistrationsPanel from "@/components/admin/tournament/RegistrationsPanel";
import ParticipantsPanel from "@/components/admin/tournament/ParticipantsPanel";
import BracketPanel from "@/components/admin/tournament/BracketPanel";
import AuditLogPanel from "@/components/admin/tournament/AuditLogPanel";

const STATUS_COLOR: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: "bg-white/5 text-white/45 border-white/10",
  [TournamentStatus.REGISTRATION]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  [TournamentStatus.LOCKED]: "bg-[color:var(--tt-gold-soft)] text-[color:var(--tt-gold)] border-[color:var(--tt-gold-border)]",
  [TournamentStatus.DRAWN]: "bg-[color:var(--tt-pink-soft)] text-[color:var(--tt-pink)] border-[color:var(--tt-pink-border)]",
  [TournamentStatus.IN_PROGRESS]: "bg-green-500/20 text-green-400 border-green-500/30",
  [TournamentStatus.COMPLETED]: "bg-white/5 text-white/45 border-white/10",
  [TournamentStatus.CANCELLED]: "bg-white/5 text-white/45 border-white/10",
};

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Tournament) => void }) {
  const [form, setForm] = useState({ title: "", maxPlayers: 8, keyword: "!jointourney" });
  const [customPlayers, setCustomPlayers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    if (!form.keyword.trim()) { setError("Entry keyword required"); return; }
    setLoading(true);
    setError(null);
    try {
      const t = await tournamentApi.create(form);
      onCreate(t);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="tt-display text-xl text-white mb-4">Create Tournament</h3>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <label className="block text-sm text-white/60 mb-1">Title</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-[color:var(--tt-gold-border)]"
          placeholder="e.g. Sunday Slot Showdown"
        />

        <label className="block text-sm text-white/60 mb-1">Entry keyword</label>
        <input
          value={form.keyword}
          onChange={(e) => setForm({ ...form, keyword: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-1 focus:outline-none focus:border-[color:var(--tt-gold-border)]"
          placeholder="!jointourney"
        />
        <p className="text-xs text-white/40 mb-4">
          Viewers type this (plus a slot name) in Kick chat to enter — the website registration form always works too.
        </p>

        <label className="block text-sm text-white/60 mb-1">Max Players</label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[4, 8, 16, 32].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setForm({ ...form, maxPlayers: n }); setCustomPlayers(""); }}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                form.maxPlayers === n && !customPlayers
                  ? "bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] border-[color:var(--tt-gold)]"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-white/50 shrink-0">Custom:</span>
          <input
            type="text" inputMode="numeric" placeholder="players"
            value={customPlayers}
            onChange={(e) => {
              setCustomPlayers(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 2) setForm({ ...form, maxPlayers: n });
            }}
            className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[color:var(--tt-gold-border)] [appearance:textfield]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] font-semibold py-2.5 rounded-lg hover:bg-[color:var(--tt-gold-hover)] disabled:opacity-40 transition-colors"
          >
            {loading ? "Creating…" : "Create"}
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

type Tab = "setup" | "registrations" | "participants" | "bracket" | "audit";
const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "Tournament Setup" },
  { id: "registrations", label: "Registrations" },
  { id: "participants", label: "Participants" },
  { id: "bracket", label: "Bracket & Matches" },
  { id: "audit", label: "Audit Log" },
];

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminTournamentPage() {
  const router = useRouter();
  const { success } = useToast();
  const [authLoading, setAuthLoading] = useState(true);
  const [adminName, setAdminName] = useState("");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [tab, setTab] = useState<Tab>("setup");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user?.isAdmin) { router.push("/"); return; }
        setAdminName(d.user?.kickUsername ?? d.user?.displayName ?? "admin");
        setAuthLoading(false);
      })
      .catch(() => router.push("/"));
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      const data = await tournamentApi.getAll();
      setTournaments(data);
      setSelected((prev) => prev ? data.find((t) => t.id === prev.id) ?? data[0] ?? null : data[0] ?? null);
    } catch {
      setError("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  // WebSocket
  useEffect(() => {
    if (!selected) return;
    const socket = getSocket();
    socket.emit("joinTournament", selected.id);
    socket.on("tournament:updated", (updated: Tournament) => {
      setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
      setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    });
    // Match-level actions (pause/resume/result) only emit match:updated, not a
    // full tournament payload — merge those into the selected tournament's
    // match list directly.
    socket.on("match:updated", (match: TournamentMatch) => {
      setSelected((prev) => (prev ? { ...prev, matches: prev.matches.map((m) => (m.id === match.id ? match : m)) } : prev));
    });
    return () => {
      socket.emit("leaveTournament", selected.id);
      socket.off("tournament:updated");
      socket.off("match:updated");
    };
  }, [selected?.id]);

  const handleMatchUpdate = useCallback((match: TournamentMatch) => {
    setSelected((prev) => (prev ? { ...prev, matches: prev.matches.map((m) => (m.id === match.id ? match : m)) } : prev));
  }, []);

  const withAction = useCallback(async (fn: () => Promise<Tournament>) => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await fn();
      setSelected(updated);
      setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      return updated;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!(await confirm({ title: "Delete this tournament?", message: `Permanently delete "${title}"? This cannot be undone.`, confirmText: "Delete" }))) return;
    setActionLoading(true);
    setError(null);
    try {
      await tournamentApi.deleteTournament(id);
      const remaining = tournaments.filter((t) => t.id !== id);
      setTournaments(remaining);
      setSelected(remaining[0] ?? null);
    } catch (e: any) {
      setError(e?.message ?? e?.error ?? "Failed to delete tournament");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--tt-gold)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 pb-10 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="tt-display text-3xl text-white">Tournament Admin</h1>
            <p className="text-white/50 text-sm mt-0.5">Create and manage viewer tournaments</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] font-semibold rounded-lg hover:bg-[color:var(--tt-gold-hover)] transition-colors text-sm"
          >
            + New Tournament
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tournament list — vertical cards */}
        <div className="space-y-2 mb-6">
          {tournaments.map((t) => {
            const isActive = selected?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className={`cursor-pointer rounded-xl border transition-all duration-200 ${
                  isActive ? "border-[color:var(--tt-gold-border)] bg-[color:var(--tt-gold-soft)]" : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      [TournamentStatus.IN_PROGRESS, TournamentStatus.REGISTRATION].includes(t.status) ? "bg-green-400 animate-pulse" :
                      [TournamentStatus.LOCKED, TournamentStatus.DRAWN].includes(t.status) ? "tt-pulse bg-[color:var(--tt-gold)]" : "bg-white/20"
                    }`} />
                    <span className="font-semibold text-white text-sm">{t.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_COLOR[t.status]}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/45">
                    <span>{t.maxPlayers} spots</span>
                    <span>{t.entryCount} entered</span>
                    {isActive && <span className="text-[color:var(--tt-gold)] text-sm">▾</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.title); }}
                      disabled={actionLoading}
                      className="ml-1 px-2 py-1 rounded-lg text-white/45 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-30 text-base"
                      title="Delete tournament"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="flex gap-6 items-start">
            {/* Local sidebar for this tournament's admin sections */}
            <div className="w-52 shrink-0 sticky top-4">
              <div className="mb-3">
                <p className="tt-display text-lg text-white truncate">{selected.title}</p>
                <p className="text-xs text-white/45 mt-0.5">
                  Signed in as <span className="text-white/70">{adminName}</span>
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === t.id
                        ? "bg-[color:var(--tt-gold-soft)] text-[color:var(--tt-gold)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <a
                href="/tournament-widget"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors text-xs"
              >
                Open OBS Widget →
              </a>
            </div>

            {/* Active panel */}
            <div className="flex-1 min-w-0">
              {tab === "setup" && (
                <SetupPanel
                  tournament={selected}
                  actionLoading={actionLoading}
                  withAction={withAction}
                  onToast={success}
                  onError={setError}
                />
              )}
              {tab === "registrations" && (
                <RegistrationsPanel
                  tournament={selected}
                  actionLoading={actionLoading}
                  withAction={withAction}
                  confirm={confirm}
                  onError={setError}
                />
              )}
              {tab === "participants" && (
                <ParticipantsPanel
                  tournament={selected}
                  actionLoading={actionLoading}
                  withAction={withAction}
                  confirm={confirm}
                  onError={setError}
                />
              )}
              {tab === "bracket" && (
                <BracketPanel
                  tournament={selected}
                  actionLoading={actionLoading}
                  withAction={withAction}
                  onMatchUpdate={handleMatchUpdate}
                  confirm={confirm}
                  onError={setError}
                />
              )}
              {tab === "audit" && <AuditLogPanel tournament={selected} />}
            </div>
          </div>
        )}

        {tournaments.length === 0 && !loading && (
          <div className="text-center py-20 text-white/45">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-lg">No tournaments yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] font-semibold rounded-lg hover:bg-[color:var(--tt-gold-hover)] transition-colors text-sm"
            >
              Create First Tournament
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(t) => {
            setTournaments((prev) => [t, ...prev]);
            setSelected(t);
            setShowCreate(false);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
