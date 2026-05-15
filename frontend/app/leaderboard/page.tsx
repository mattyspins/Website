"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowRight, Users, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

interface Leaderboard {
  id: string;
  title: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  totalPrizePool: number;
  participantCount: number;
}

function formatTimeRemaining(endDate: string): string {
  const ms = new Date(endDate).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h remaining`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m remaining`;
}

export default function LeaderboardsPage() {
  const router = useRouter();
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [archived, setArchived] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch(API_ENDPOINTS.LEADERBOARDS_ACTIVE),
        fetch(API_ENDPOINTS.LEADERBOARDS_COMPLETED),
      ]);
      if (activeRes.ok) {
        const data = await activeRes.json();
        setLeaderboards(data.leaderboards || []);
      }
      if (archivedRes.ok) {
        const data = await archivedRes.json();
        setArchived(data.leaderboards || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 w-64 bg-navy-700 rounded-lg animate-pulse mx-auto mb-3" />
            <div className="h-4 w-80 bg-navy-800 rounded animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-navy-800/60 border border-white/5 rounded-xl p-6 h-48 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Trophy className="w-10 h-10 text-gold-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Leaderboards
          </h1>
          <p className="text-gray-500">
            Compete in active wager races and climb to the top for cash prizes.
          </p>
        </motion.div>

        {leaderboards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <Trophy className="w-14 h-14 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              No Active Leaderboards
            </h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              There are no active competitions right now. Follow our Discord for
              announcements about upcoming races.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {leaderboards.map((lb, i) => (
              <motion.div
                key={lb.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => router.push(`/leaderboard/${lb.id}`)}
                className="bg-navy-800/60 border border-white/6 rounded-xl p-6 cursor-pointer card-hover group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-white font-bold text-xl mb-1 truncate">
                      {lb.title}
                    </h3>
                    {lb.description && (
                      <p className="text-gray-500 text-sm line-clamp-2">
                        {lb.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      lb.status === "active"
                        ? "bg-green-500/15 text-green-400 border border-green-500/25"
                        : lb.status === "upcoming"
                          ? "bg-gold-500/15 text-gold-400 border border-gold-500/25"
                          : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
                    }`}
                  >
                    {lb.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-navy-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Prize Pool
                    </div>
                    <p className="text-prize font-bold text-lg font-gaming">
                      ${(lb.totalPrizePool || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-navy-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Users className="w-3.5 h-3.5" />
                      Players
                    </div>
                    <p className="text-white font-bold text-lg">
                      {lb.participantCount || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-gray-600 text-xs">
                    {lb.status === "active"
                      ? formatTimeRemaining(lb.endDate)
                      : `Ends ${new Date(lb.endDate).toLocaleDateString()}`}
                  </p>
                  <span className="flex items-center gap-1 text-gold-400 text-sm font-semibold group-hover:gap-2 transition-all">
                    View
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {/* Archived leaderboards */}
        {archived.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">Past Leaderboards</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archived.map((lb) => (
                <div
                  key={lb.id}
                  onClick={() => router.push(`/leaderboard/${lb.id}`)}
                  className="bg-navy-800/40 border border-white/5 rounded-xl p-5 cursor-pointer hover:border-white/10 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-gray-300 font-semibold text-sm truncate">{lb.title}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Ended {new Date(lb.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {lb.totalPrizePool ? ` · $${lb.totalPrizePool.toLocaleString()} prize pool` : ""}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
