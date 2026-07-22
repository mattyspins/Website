"use client";

import { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";

interface AuditLogEntry {
  id: string;
  adminId: string | null;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  changes: { oldValues: unknown; newValues: unknown };
  reason?: string;
  timestamp: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function ChangesPreview({ changes }: { changes: AuditLogEntry["changes"] }) {
  const hasOld = !!(changes?.oldValues && Object.keys(changes.oldValues as object).length > 0);
  const hasNew = !!(changes?.newValues && Object.keys(changes.newValues as object).length > 0);
  if (!hasOld && !hasNew) return null;
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
      {hasOld && (
        <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-2 overflow-x-auto">
          <p className="text-red-400/70 uppercase tracking-wide text-[10px] mb-1">Before</p>
          <pre className="text-red-300/80 whitespace-pre-wrap break-all">{JSON.stringify(changes.oldValues, null, 2)}</pre>
        </div>
      )}
      {hasNew && (
        <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-2 overflow-x-auto">
          <p className="text-green-400/70 uppercase tracking-wide text-[10px] mb-1">After</p>
          <pre className="text-green-300/80 whitespace-pre-wrap break-all">{JSON.stringify(changes.newValues, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 50;

  const load = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (actionFilter) params.set("action", actionFilter);
    const res = await fetch(`${API_ENDPOINTS.ADMIN_AUDIT_LOGS}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      setLogs(data.data.logs);
      setTotal(data.data.pagination.total);
    }
  }, [offset, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white tracking-wide">Audit Log</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {total.toLocaleString()} recorded admin action{total !== 1 ? "s" : ""}
          </p>
        </div>
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          placeholder="Filter by action (e.g. suspend_user)…"
          className="bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-gold-400/50 w-64 max-w-full"
        />
      </div>

      <div className="bg-navy-800/60 border border-white/6 rounded-xl overflow-hidden">
        {!logs ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No audit log entries found</div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="text-white font-medium">{log.adminName}</span>{" "}
                      <span className="text-gold-400 font-mono text-xs bg-gold-500/10 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      {log.targetType && (
                        <span className="text-gray-400"> · {log.targetType}{log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}</span>
                      )}
                    </p>
                    {log.reason && <p className="text-gray-400 text-xs mt-1">{log.reason}</p>}
                    <ChangesPreview changes={log.changes} />
                  </div>
                  <time className="text-gray-400 text-xs shrink-0 tabular-nums">{formatTime(log.timestamp)}</time>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            disabled={page === 1}
            className="px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
          >
            ← Previous
          </button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setOffset((o) => o + limit)}
            disabled={page === totalPages}
            className="px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
