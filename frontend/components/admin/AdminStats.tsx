"use client";

import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { isAuthenticated } from "@/lib/authPersistence";
import { Users, Coins, Ticket, Clock, UserCheck, AlertTriangle, Activity, Link2 } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  totalCoinsSpent: number;
  recentSignups: number;
  suspendedUsers: number;
  verifiedReferrals: number;
  pendingReferrals: number;
  unlinkedReferralWagerers: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  urgent?: boolean;
}

function StatCard({ label, value, sub, icon, accent, urgent }: StatCardProps) {
  return (
    <div className={`bg-navy-800/60 border rounded-xl p-5 flex items-start gap-4 ${urgent ? "border-yellow-500/30" : "border-white/6"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black ${urgent ? "text-yellow-400" : "text-white"}`}>{value}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [activeRaffles, setActiveRaffles] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    if (!isAuthenticated()) return;

    try {
      const [statsRes, claimsRes, rafflesRes] = await Promise.all([
        authFetch(API_ENDPOINTS.ADMIN_STATS),
        authFetch(API_ENDPOINTS.MILESTONES_CLAIMS_ADMIN),
        authFetch(API_ENDPOINTS.RAFFLES_ADMIN_ALL),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data);
      }
      if (claimsRes.ok) {
        const d = await claimsRes.json();
        const pending = (d.claims ?? []).filter((c: any) => c.status === "pending").length;
        setPendingClaims(pending);
      }
      if (rafflesRes.ok) {
        const d = await rafflesRes.json();
        const active = (d.raffles ?? []).filter((r: any) => r.status === "active").length;
        setActiveRaffles(active);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-navy-800/40 border border-white/5 rounded-xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-400 text-sm text-center py-12">Failed to load statistics.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          sub={`+${stats.recentSignups} recent signups`}
          icon={<Users className="w-5 h-5 text-yellow-400" />}
          accent="bg-yellow-500/15"
        />
        <StatCard
          label="Active Today"
          value={stats.activeUsers.toLocaleString()}
          sub="Last 24 hours"
          icon={<Activity className="w-5 h-5 text-green-400" />}
          accent="bg-green-500/15"
        />
        <StatCard
          label="Coins in Circulation"
          value={stats.totalPoints.toLocaleString()}
          sub="Currently held by users"
          icon={<Coins className="w-5 h-5 text-gold-400" />}
          accent="bg-gold-500/15"
        />
        <StatCard
          label="Coins Spent"
          value={(stats.totalCoinsSpent ?? 0).toLocaleString()}
          sub="All-time"
          icon={<Coins className="w-5 h-5 text-orange-400" />}
          accent="bg-orange-500/15"
        />
        <StatCard
          label="Pending Claims"
          value={pendingClaims}
          sub={pendingClaims > 0 ? "Needs review" : "All clear"}
          icon={<Clock className="w-5 h-5 text-yellow-400" />}
          accent="bg-yellow-500/15"
          urgent={pendingClaims > 0}
        />
        <StatCard
          label="Active Raffles"
          value={activeRaffles}
          icon={<Ticket className="w-5 h-5 text-pink-400" />}
          accent="bg-pink-500/15"
        />
        <StatCard
          label="Suspended Users"
          value={stats.suspendedUsers}
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          accent="bg-red-500/15"
          urgent={stats.suspendedUsers > 0}
        />
        <StatCard
          label="Verified Referrals"
          value={stats.verifiedReferrals}
          sub={`${stats.pendingReferrals} pending verification`}
          icon={<UserCheck className="w-5 h-5 text-cyan-400" />}
          accent="bg-cyan-500/15"
        />
        <StatCard
          label="Unlinked Wagerers"
          value={stats.unlinkedReferralWagerers}
          sub="Razed usernames with no linked account"
          icon={<Link2 className="w-5 h-5 text-purple-400" />}
          accent="bg-purple-500/15"
          urgent={stats.unlinkedReferralWagerers > 0}
        />
      </div>

      {pendingClaims > 0 && (
        <div className="bg-yellow-500/8 border border-yellow-500/25 rounded-xl px-5 py-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="text-yellow-300 text-sm">
            <span className="font-bold">{pendingClaims} milestone claim{pendingClaims !== 1 ? "s" : ""}</span> waiting for approval — go to the <span className="font-bold">Claims</span> tab to review.
          </p>
        </div>
      )}
    </div>
  );
}
