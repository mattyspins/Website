"use client";

import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface Claim {
  id: string;
  status: "pending" | "approved" | "rejected";
  tierId: number;
  tierName: string;
  reward: number;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    discordId: string;
    kickUsername?: string;
    rainbetUsername?: string;
  };
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function AdminMilestoneClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => { loadClaims(); }, []);

  const token = () => localStorage.getItem("access_token") ?? "";

  const loadClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.MILESTONES_CLAIMS_ADMIN, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await res.json();
      if (d.success) setClaims(d.claims);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleAction = async (claimId: string, status: "approved" | "rejected") => {
    setActioning(claimId);
    try {
      const res = await fetch(API_ENDPOINTS.MILESTONES_CLAIM_UPDATE(claimId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status } : c));
      }
    } catch { /* ignore */ } finally { setActioning(null); }
  };

  const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);
  const pendingCount = claims.filter((c) => c.status === "pending").length;

  const statusBadge = (status: string) => {
    if (status === "approved") return <span className="bg-green-500/15 text-green-400 border border-green-500/25 text-xs font-bold px-2.5 py-1 rounded-full">APPROVED</span>;
    if (status === "rejected") return <span className="bg-red-500/15 text-red-400 border border-red-500/25 text-xs font-bold px-2.5 py-1 rounded-full">REJECTED</span>;
    return <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />PENDING</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Milestone Claims</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {pendingCount > 0
              ? <span className="text-yellow-400 font-semibold">{pendingCount} pending claim{pendingCount !== 1 ? "s" : ""} waiting for review</span>
              : "No pending claims"}
          </p>
        </div>
        <button onClick={loadClaims} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count = f === "all" ? claims.length : claims.filter((c) => c.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors border ${
                filter === f
                  ? "bg-gold-500/15 border-gold-500/30 text-gold-400"
                  : "bg-white/3 border-white/8 text-gray-400 hover:text-white"
              }`}
            >
              {f} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading claims...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-navy-800/40 border border-white/5 rounded-xl">
          <CheckCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No {filter === "all" ? "" : filter} claims</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <div key={claim.id} className={`bg-navy-800/60 border rounded-xl p-5 flex items-center gap-4 flex-wrap ${
              claim.status === "pending" ? "border-yellow-500/20" : "border-white/6"
            }`}>
              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <p className="text-white font-semibold">{claim.user.displayName}</p>
                  {statusBadge(claim.status)}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                  <span>{claim.user.discordId}</span>
                  {claim.user.kickUsername && <span>Kick: {claim.user.kickUsername}</span>}
                  {claim.user.rainbetUsername && <span>Razed: {claim.user.rainbetUsername}</span>}
                </div>
              </div>

              {/* Tier + reward */}
              <div className="text-center shrink-0">
                <p className="text-white font-bold text-lg">${claim.reward}</p>
                <p className="text-gray-400 text-xs">{claim.tierName} tier</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {new Date(claim.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {/* Actions */}
              {claim.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(claim.id, "approved")}
                    disabled={actioning === claim.id}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(claim.id, "rejected")}
                    disabled={actioning === claim.id}
                    className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
