"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Trophy } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface MilestoneTier {
  id: number;
  name: string;
  wagerRequired: number;
  reward: number;
  unlocked: boolean;
  claimStatus: "pending" | "approved" | "rejected" | null;
}

const TIER_META: Record<string, { color: string; bg: string; ring: string; label: string }> = {
  Rookie:       { color: "text-gray-300",  bg: "from-gray-700/60 to-gray-800/60",   ring: "ring-gray-600/40",   label: "ROOKIE" },
  Hustler:      { color: "text-blue-300",  bg: "from-blue-900/50 to-navy-800/60",   ring: "ring-blue-500/30",   label: "HUSTLER" },
  Grinder:      { color: "text-green-300", bg: "from-green-900/50 to-navy-800/60",  ring: "ring-green-500/30",  label: "GRINDER" },
  "High Roller":{ color: "text-purple-300",bg: "from-purple-900/50 to-navy-800/60", ring: "ring-purple-500/30", label: "HIGH ROLLER" },
  VIP:          { color: "text-gold-300",  bg: "from-gold-900/40 to-navy-800/60",   ring: "ring-gold-500/30",   label: "VIP" },
  Elite:        { color: "text-gold-200",  bg: "from-gold-800/40 to-navy-800/60",   ring: "ring-gold-400/40",   label: "ELITE" },
  Diamond:      { color: "text-cyan-300",  bg: "from-cyan-900/50 to-navy-800/60",   ring: "ring-cyan-400/40",   label: "DIAMOND" },
  Legend:       { color: "text-red-300",   bg: "from-red-900/50 to-navy-800/60",    ring: "ring-red-400/50",    label: "LEGEND" },
};

function formatWager(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;
}

export default function MilestonesPage() {
  const [tiers, setTiers] = useState<MilestoneTier[]>([]);
  const [totalWagered, setTotalWagered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimMsgs, setClaimMsgs] = useState<Record<number, string>>({});

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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleClaim = async (tier: MilestoneTier) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setClaiming(tier.id);
    try {
      const res = await fetch(API_ENDPOINTS.MILESTONES_CLAIM, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tierId: tier.id }),
      });
      const d = await res.json();
      if (d.success) {
        if (d.alreadyClaimed) {
          setClaimMsgs((m) => ({ ...m, [tier.id]: "Already submitted" }));
        } else {
          setTiers((ts) => ts.map((t) => t.id === tier.id ? { ...t, claimStatus: "pending" } : t));
          setClaimMsgs((m) => ({ ...m, [tier.id]: "Submitted! Check Discord." }));
        }
      } else {
        setClaimMsgs((m) => ({ ...m, [tier.id]: d.error?.message || "Failed." }));
      }
    } catch {
      setClaimMsgs((m) => ({ ...m, [tier.id]: "Network error." }));
    } finally { setClaiming(null); }
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-navy-800/40 border border-white/5 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tiers.map((tier, i) => {
              const meta = TIER_META[tier.name] ?? TIER_META["Rookie"];
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`relative bg-gradient-to-b ${meta.bg} border border-white/8 rounded-2xl p-5 flex flex-col items-center text-center ring-1 ${meta.ring} ${!tier.unlocked ? "opacity-60" : ""}`}
                >
                  {/* Lock / unlock icon */}
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${tier.unlocked ? "bg-gold-500/20 ring-2 ring-gold-500/30" : "bg-white/5"}`}>
                    {tier.unlocked ? (
                      <Trophy className="w-8 h-8 text-gold-400" />
                    ) : (
                      <Lock className="w-7 h-7 text-gray-500" />
                    )}
                  </div>

                  {/* Tier badge */}
                  <span className={`text-[10px] font-black tracking-widest uppercase mb-3 ${meta.color}`}>
                    {meta.label}
                  </span>

                  {/* Reward amount */}
                  <p className={`text-3xl font-black mb-1 ${tier.unlocked ? "text-green-400" : "text-gray-500"}`}>
                    ${tier.reward.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-4">Cash Reward</p>

                  {/* Wager requirement */}
                  <p className="text-gray-400 text-xs font-semibold mb-5">
                    {formatWager(tier.wagerRequired)} WAGERED
                  </p>

                  {/* Action button */}
                  <div className="w-full mt-auto">
                    {tier.claimStatus === "approved" ? (
                      <div className="w-full bg-green-500/15 border border-green-500/30 rounded-xl py-2 text-green-400 text-xs font-black tracking-widest text-center uppercase">
                        PAID ✓
                      </div>
                    ) : tier.claimStatus === "pending" ? (
                      <div className="w-full bg-yellow-500/15 border border-yellow-500/25 rounded-xl py-2 text-yellow-400 text-xs font-black tracking-widest text-center uppercase">
                        PENDING
                      </div>
                    ) : tier.unlocked && isAuthenticated ? (
                      <>
                        <button
                          onClick={() => handleClaim(tier)}
                          disabled={claiming === tier.id}
                          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-black py-2 rounded-xl transition-all uppercase tracking-widest"
                        >
                          {claiming === tier.id ? "..." : `CLAIM $${tier.reward}`}
                        </button>
                        {claimMsgs[tier.id] && (
                          <p className="text-xs text-center text-gray-400 mt-1.5">{claimMsgs[tier.id]}</p>
                        )}
                      </>
                    ) : tier.unlocked ? (
                      <div className="w-full bg-gold-500/15 border border-gold-500/25 rounded-xl py-2 text-gold-400 text-xs font-black tracking-widest text-center uppercase">
                        UNLOCKED ✓
                      </div>
                    ) : (
                      <div className="w-full bg-white/5 border border-white/8 rounded-xl py-2 text-gray-500 text-xs font-black tracking-widest text-center uppercase">
                        LOCKED
                      </div>
                    )}
                  </div>
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
                <p>Click the claim button when you hit a milestone — we&apos;ll reach out via Discord to pay you out</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
