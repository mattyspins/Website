"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Trophy, ExternalLink } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface MilestoneTier {
  id: number;
  name: string;
  wagerRequired: number;
  reward: number;
  unlocked: boolean;
}

const TIER_COLORS: Record<string, { border: string; glow: string; badge: string }> = {
  Rookie:       { border: "border-gray-600/40",   glow: "",                         badge: "bg-gray-700 text-gray-300" },
  Hustler:      { border: "border-blue-500/30",   glow: "shadow-blue-500/10",       badge: "bg-blue-900/60 text-blue-300" },
  Grinder:      { border: "border-green-500/30",  glow: "shadow-green-500/10",      badge: "bg-green-900/60 text-green-300" },
  "High Roller":{ border: "border-purple-500/30", glow: "shadow-purple-500/10",     badge: "bg-purple-900/60 text-purple-300" },
  VIP:          { border: "border-gold-500/30",   glow: "shadow-gold-500/10",       badge: "bg-gold-900/60 text-gold-300" },
  Elite:        { border: "border-gold-400/40",   glow: "shadow-gold-400/15",       badge: "bg-gold-800/60 text-gold-200" },
  Diamond:      { border: "border-cyan-400/40",   glow: "shadow-cyan-400/15",       badge: "bg-cyan-900/60 text-cyan-300" },
  Legend:       { border: "border-red-400/50",    glow: "shadow-red-400/20",        badge: "bg-red-900/60 text-red-300" },
};

function formatDollar(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`;
}

export default function MilestonesPage() {
  const [tiers, setTiers] = useState<MilestoneTier[]>([]);
  const [totalWagered, setTotalWagered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
    loadMilestones(token);
  }, []);

  const loadMilestones = async (token: string | null) => {
    try {
      const res = await fetch(API_ENDPOINTS.MILESTONES, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setTiers(data.tiers);
        setTotalWagered(Number(data.totalWagered));
      }
    } catch {
      // show static tiers with 0 wager on failure
    } finally {
      setLoading(false);
    }
  };

  const nextMilestone = tiers.find((t) => !t.unlocked);
  const progressPct = nextMilestone
    ? Math.min((totalWagered / nextMilestone.wagerRequired) * 100, 100)
    : 100;
  const unlockedCount = tiers.filter((t) => t.unlocked).length;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            AceBet Wager Milestones
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            MILE<span className="text-gold-400">STONES</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Wager on{" "}
            <a
              href="https://acebet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 underline underline-offset-2"
            >
              AceBet
            </a>{" "}
            and unlock cash rewards at every tier. Only AceBet wagers count.
          </p>
        </motion.div>

        {/* Progress card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Your Total Wager</p>
              <p className="text-3xl font-bold text-white">
                ${totalWagered.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Milestones Unlocked</p>
              <p className="text-2xl font-bold text-gold-400">
                {unlockedCount} <span className="text-gray-500 text-lg">/ {tiers.length}</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {nextMilestone && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress to {nextMilestone.name}</span>
                <span>${totalWagered.toLocaleString()} / ${nextMilestone.wagerRequired.toLocaleString()}</span>
              </div>
              <div className="h-2.5 bg-navy-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                />
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <p className="text-center text-gray-500 text-sm mt-4">
              <a href="/" className="text-gold-400 hover:text-gold-300 underline underline-offset-2">
                Login with Discord
              </a>{" "}
              to see your progress
            </p>
          )}
        </motion.div>

        {/* Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-gold-500/8 border border-gold-500/20 rounded-xl px-5 py-4 mb-10 flex items-start gap-3"
        >
          <Trophy className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-gold-300 font-semibold text-sm">Only AceBet wagers count</p>
            <p className="text-gray-400 text-sm mt-0.5">
              Starting now, only wagering on AceBet counts towards wager milestones and leaderboard rewards.
              Link your AceBet account in your{" "}
              <a href="/profile" className="text-gold-400 hover:text-gold-300 underline underline-offset-2">profile</a>.
            </p>
          </div>
        </motion.div>

        {/* Milestones grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-navy-800/40 border border-white/5 rounded-xl h-52 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier, i) => {
              const colors = TIER_COLORS[tier.name] ?? TIER_COLORS["Rookie"];
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`relative bg-navy-800/60 border ${colors.border} rounded-xl p-5 flex flex-col items-center text-center shadow-lg ${tier.unlocked ? colors.glow : ""} ${tier.unlocked ? "ring-1 ring-gold-500/20" : "opacity-70"}`}
                >
                  {/* Lock / unlock icon */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${tier.unlocked ? "bg-gold-500/15" : "bg-white/5"}`}>
                    {tier.unlocked ? (
                      <CheckCircle className="w-8 h-8 text-gold-400" />
                    ) : (
                      <Lock className="w-7 h-7 text-gray-600" />
                    )}
                  </div>

                  {/* Tier name */}
                  <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded mb-2 ${colors.badge}`}>
                    {tier.name}
                  </span>

                  {/* Reward */}
                  <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Reward</p>
                  <p className={`text-2xl font-bold mt-0.5 ${tier.unlocked ? "text-gold-400" : "text-gray-400"}`}>
                    ${tier.reward.toLocaleString()}
                  </p>

                  {/* Requirement */}
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-3">Requires</p>
                  <p className="text-white font-semibold text-sm mt-0.5">
                    {formatDollar(tier.wagerRequired)} wagered
                  </p>

                  {/* Unlocked banner */}
                  {tier.unlocked && (
                    <div className="mt-3 w-full bg-gold-500/10 border border-gold-500/20 rounded-lg py-1 text-gold-400 text-xs font-semibold tracking-wide">
                      UNLOCKED ✓
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-navy-800/40 border border-white/5 rounded-xl p-6"
        >
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">01</span>
              <div>
                <p className="text-gray-300 font-medium">Link AceBet</p>
                <p>Verify your AceBet username in your profile to start tracking wagers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">02</span>
              <div>
                <p className="text-gray-300 font-medium">Wager on AceBet</p>
                <p>Only wagers placed on AceBet count towards milestone progress</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">03</span>
              <div>
                <p className="text-gray-300 font-medium">Claim Rewards</p>
                <p>Open a ticket in Discord when you hit a milestone to receive your cash reward</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
