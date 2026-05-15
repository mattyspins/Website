"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Lock, Trophy } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

const TIER_COLORS: Record<string, { border: string; badge: string }> = {
  Rookie:       { border: "border-gray-600/40",   badge: "bg-gray-700 text-gray-300" },
  Hustler:      { border: "border-blue-500/30",   badge: "bg-blue-900/60 text-blue-300" },
  Grinder:      { border: "border-green-500/30",  badge: "bg-green-900/60 text-green-300" },
  "High Roller":{ border: "border-purple-500/30", badge: "bg-purple-900/60 text-purple-300" },
  VIP:          { border: "border-gold-500/30",   badge: "bg-gold-900/60 text-gold-300" },
  Elite:        { border: "border-gold-400/40",   badge: "bg-gold-800/60 text-gold-200" },
  Diamond:      { border: "border-cyan-400/40",   badge: "bg-cyan-900/60 text-cyan-300" },
  Legend:       { border: "border-red-400/50",    badge: "bg-red-900/60 text-red-300" },
};

interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  totalWagered: number;
  totalDeposited: number;
  createdAt: string;
  kickUsername?: string;
  rainbetVerified: boolean;
  tiers: Array<{
    id: number; name: string; wagerRequired: number; reward: number;
    unlocked: boolean; claimStatus: string | null;
  }>;
  unlockedCount: number;
}

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(API_ENDPOINTS.USER_PUBLIC_PROFILE(userId))
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d?.profile) setProfile(d.profile); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-navy-800/60 border border-white/5 rounded-xl p-6 h-40 animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-navy-800/40 h-24 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg font-semibold">User not found</p>
          <p className="text-gray-600 text-sm mt-1">This profile doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-navy-800/60 border border-white/6 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gold-600 to-gold-400 flex-shrink-0 flex items-center justify-center">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">{profile.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl font-bold mb-1 truncate">{profile.displayName}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                {profile.kickUsername && (
                  <span className="text-[#53FC18] text-xs font-semibold flex items-center gap-1">
                    <span className="w-3 h-3 bg-[#53FC18] rounded-sm flex items-center justify-center">
                      <span className="text-black text-[7px] font-bold">K</span>
                    </span>
                    {profile.kickUsername}
                  </span>
                )}
                {profile.rainbetVerified && (
                  <span className="text-gold-400 text-xs font-semibold">AceBet ✓</span>
                )}
              </div>
              <p className="text-gray-600 text-xs mt-1">Joined {joinedDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-navy-900/60 border border-white/6 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-1.5">Wagered</p>
              <p className="text-gold-400 font-gaming font-bold text-2xl leading-none">
                ${profile.totalWagered.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-gray-600 text-xs mt-1">Total on AceBet</p>
            </div>
            <div className="bg-navy-900/60 border border-white/6 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs font-semibold tracking-widest uppercase mb-1.5">Milestones</p>
              <p className="text-white font-gaming font-bold text-2xl leading-none">
                {profile.unlockedCount} <span className="text-gray-600 text-lg">/ {profile.tiers.length}</span>
              </p>
              <p className="text-gray-600 text-xs mt-1">Unlocked</p>
            </div>
          </div>
        </motion.div>

        {/* Milestone grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-400" /> Milestone Progress
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile.tiers.map((tier) => {
              const colors = TIER_COLORS[tier.name] ?? TIER_COLORS["Rookie"];
              return (
                <div key={tier.id}
                  className={`bg-navy-800/60 border ${colors.border} rounded-xl p-4 flex flex-col items-center text-center ${tier.unlocked ? "" : "opacity-50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${tier.unlocked ? "bg-gold-500/15" : "bg-white/5"}`}>
                    {tier.unlocked ? <CheckCircle className="w-6 h-6 text-gold-400" /> : <Lock className="w-5 h-5 text-gray-600" />}
                  </div>
                  <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded mb-1 ${colors.badge}`}>
                    {tier.name}
                  </span>
                  <p className={`text-lg font-bold ${tier.unlocked ? "text-gold-400" : "text-gray-600"}`}>
                    ${tier.reward}
                  </p>
                  {tier.claimStatus === "approved" && (
                    <span className="text-[9px] text-green-400 font-semibold mt-0.5">PAID</span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
