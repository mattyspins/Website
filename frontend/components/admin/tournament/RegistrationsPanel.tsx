"use client";

import { useEffect, useState, useCallback } from "react";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, TournamentEntry } from "@/types/tournament";

type ConfirmFn = (opts: { title: string; message: string; confirmText?: string; confirmColor?: "red" | "yellow" | "green" }) => Promise<boolean>;

interface Props {
  tournament: Tournament;
  actionLoading: boolean;
  withAction: (fn: () => Promise<Tournament>) => Promise<Tournament>;
  confirm: ConfirmFn;
  onError: (msg: string) => void;
}

export default function RegistrationsPanel({ tournament, actionLoading, withAction, confirm, onError }: Props) {
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    tournamentApi.getEntries(tournament.id)
      .then(setEntries)
      .catch(() => onError("Failed to load registrations"))
      .finally(() => setLoading(false));
  }, [tournament.id]);

  useEffect(() => { load(); }, [load, tournament.updatedAt]);

  const filtered = search.trim()
    ? entries.filter((e) => e.displayName.toLowerCase().includes(search.trim().toLowerCase()))
    : entries;

  const run = async (id: string, fn: () => Promise<Tournament>) => {
    setBusyId(id);
    try {
      await withAction(fn);
      load();
    } catch { /* surfaced via onError */ }
    finally { setBusyId(null); }
  };

  const handleBan = async (entry: TournamentEntry) => {
    if (!(await confirm({
      title: `Ban ${entry.displayName}?`,
      message: "They'll be blocked from entering this tournament again. This does not affect their site account.",
      confirmText: "Ban",
      confirmColor: "red",
    }))) return;
    run(entry.id, () => tournamentApi.banUser(tournament.id, entry.userId));
  };

  const handleUnban = (entry: TournamentEntry) => run(entry.id, () => tournamentApi.unbanUser(tournament.id, entry.userId));
  const handleInvalidate = (entry: TournamentEntry) => run(entry.id, () => tournamentApi.invalidateEntry(tournament.id, entry.id));
  const handleRestore = (entry: TournamentEntry) => run(entry.id, () => tournamentApi.restoreEntry(tournament.id, entry.id));

  return (
    <div className="space-y-4">
      <h2 className="tt-display text-2xl text-white">
        Registrations <span className="text-white/40 text-lg">({entries.length})</span>
      </h2>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by username…"
        className="w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[color:var(--tt-gold-border)]"
      />

      <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.2fr_0.8fr_1fr_1.4fr] px-4 py-2.5 bg-black/20 text-[11px] uppercase tracking-wide text-white/50 font-bold">
          <div>Username</div><div>Slot</div><div>Source</div><div>Time</div><div>Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-white/40 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/40 text-sm">No registrations{search ? " match your search" : " yet"}.</div>
        ) : (
          filtered.map((e) => (
            <div key={e.id} className="grid grid-cols-[1.4fr_1.2fr_0.8fr_1fr_1.4fr] px-4 py-2.5 border-t border-white/6 items-center text-sm">
              <div className={e.invalidated ? "line-through text-white/40" : "text-white font-medium"}>
                {e.displayName}
                {e.banned && <span className="ml-1.5 text-[10px] text-red-400 font-bold uppercase">Banned</span>}
              </div>
              <div className="text-white/70 truncate">{e.slot ?? "—"}</div>
              <div className="text-white/50 text-xs uppercase">{e.source.toLowerCase()}</div>
              <div className="text-white/50 text-xs">{new Date(e.enteredAt).toLocaleTimeString()}</div>
              <div className="flex gap-1.5">
                {e.invalidated ? (
                  <button
                    onClick={() => handleRestore(e)}
                    disabled={actionLoading || busyId === e.id}
                    className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={() => handleInvalidate(e)}
                    disabled={actionLoading || busyId === e.id}
                    className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    Invalidate
                  </button>
                )}
                {e.banned ? (
                  <button
                    onClick={() => handleUnban(e)}
                    disabled={actionLoading || busyId === e.id}
                    className="text-[11px] px-2.5 py-1 rounded-md border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => handleBan(e)}
                    disabled={actionLoading || busyId === e.id}
                    className="text-[11px] px-2.5 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-30 transition-colors"
                  >
                    Ban
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
