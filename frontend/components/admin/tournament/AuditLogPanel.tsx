"use client";

import { useEffect, useState } from "react";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, AuditLogEntry } from "@/types/tournament";

const ACTION_LABELS: Record<string, string> = {
  CREATE_TOURNAMENT: "Created tournament",
  UPDATE_TOURNAMENT: "Updated setup",
  OPEN_REGISTRATION: "Opened registration",
  LOCK_REGISTRATION: "Locked registration",
  RUN_DRAW: "Ran the draw",
  START_TOURNAMENT: "Started tournament",
  INVALIDATE_ENTRY: "Invalidated an entry",
  RESTORE_ENTRY: "Restored an entry",
  BAN_USER: "Banned a viewer",
  UNBAN_USER: "Unbanned a viewer",
  REPLACE_PARTICIPANT: "Replaced participant with reserve",
  SET_MATCH_RESULT: "Set a match result",
  DECLARE_WINNER: "Declared a match winner",
  REVERT_WINNER: "Reverted a match result",
  PAUSE_MATCH: "Paused a match",
  RESUME_MATCH: "Resumed a match",
  CANCEL_TOURNAMENT: "Cancelled tournament",
  DELETE_TOURNAMENT: "Deleted tournament",
};

export default function AuditLogPanel({ tournament }: { tournament: Tournament }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tournamentApi.getAuditLog(tournament.id)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tournament.id, tournament.updatedAt]);

  return (
    <div className="space-y-4">
      <h2 className="tt-display text-2xl text-white">Audit Log</h2>
      <div className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1.6fr_1.2fr] px-4 py-2.5 bg-black/20 text-[11px] uppercase tracking-wide text-white/50 font-bold">
          <div>When</div><div>Action</div><div>Admin</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-white/40 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/40 text-sm">No actions logged yet.</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="grid grid-cols-[1fr_1.6fr_1.2fr] px-4 py-2.5 border-t border-white/6 text-sm">
              <div className="text-white/50 text-xs">{new Date(e.createdAt).toLocaleString()}</div>
              <div className="text-white/90">{ACTION_LABELS[e.action] ?? e.action}</div>
              <div className="text-white/60">{e.adminName ?? "—"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
