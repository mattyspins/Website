"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface Ranking {
  rank: number;
  userId: string;
  username: string;
  kickUsername?: string;
  totalWagers: number;
  wagerCount: number;
  prize?: string;
  prizeDescription?: string;
}

interface Leaderboard {
  id: string;
  title: string;
  description?: string;
  prizePool: string;
  status: string;
  startDate: string;
  endDate: string;
}

function maskUsername(username: string): string {
  if (username.length <= 3) return username;
  const first = username[0];
  const last = username.slice(-2);
  const stars = "*".repeat(Math.min(username.length - 3, 10));
  return `${first}${stars}${last}`;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
}

function AvatarCircle({
  username,
  size = "md",
}: {
  username: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-xl",
  };

  const colors = [
    "from-blue-500 to-blue-700",
    "from-purple-500 to-purple-700",
    "from-cyan-500 to-cyan-700",
    "from-indigo-500 to-indigo-700",
  ];
  const color = colors[username.charCodeAt(0) % colors.length];

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

function PodiumCard({
  ranking,
  position,
}: {
  ranking: Ranking;
  position: 1 | 2 | 3;
}) {
  const config = {
    1: {
      label: "1ST PLACE",
      topBorder: "#f59e0b",
      rankColor: "text-gold-400",
      prizeGlow: "shadow-gold",
      height: "py-8",
      avatarSize: "lg" as const,
      scale: "scale-105 z-10",
    },
    2: {
      label: "2ND PLACE",
      topBorder: "#9ca3af",
      rankColor: "text-gray-300",
      prizeGlow: "",
      height: "py-6",
      avatarSize: "md" as const,
      scale: "",
    },
    3: {
      label: "3RD PLACE",
      topBorder: "#c87941",
      rankColor: "text-orange-400",
      prizeGlow: "",
      height: "py-6",
      avatarSize: "md" as const,
      scale: "",
    },
  };

  const c = config[position];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={`relative flex-1 bg-navy-800/80 backdrop-blur-sm border border-white/6 rounded-xl ${c.height} px-5 flex flex-col items-center text-center ${c.scale}`}
      style={{ borderTop: `3px solid ${c.topBorder}` }}
    >
      {/* Rank number */}
      <span
        className={`absolute top-3 right-4 font-gaming font-bold text-2xl ${c.rankColor} opacity-60`}
      >
        #{position}
      </span>

      <AvatarCircle username={ranking.username} size={c.avatarSize} />

      <p className="text-gray-500 text-xs font-semibold tracking-widest mt-3 mb-1">
        {c.label}
      </p>
      <p className="text-white font-bold text-base mb-4">
        {maskUsername(ranking.username)}
      </p>

      <div className="w-full bg-navy-900/60 rounded-lg p-3 mb-3">
        <p className="text-gray-500 text-xs tracking-wider mb-1">
          TOTAL WAGERED
        </p>
        <p className="text-white font-bold text-lg font-gaming">
          ${ranking.totalWagers.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {ranking.prize && (
        <div>
          <p className="text-gray-500 text-xs tracking-wider mb-1">PRIZE</p>
          <p className="text-prize font-bold text-xl prize-text">
            {ranking.prize}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function PublicLeaderboardPage() {
  const params = useParams();
  const leaderboardId = params.id as string;

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardDetails();

    const socket = getSocket();
    socket.emit("joinLeaderboard", leaderboardId);
    socket.on(
      "rankingsUpdated",
      (data: { leaderboardId: string; rankings: Ranking[] }) => {
        if (data.leaderboardId === leaderboardId) setRankings(data.rankings);
      },
    );

    const interval = setInterval(fetchLeaderboardDetails, 30000);
    return () => {
      clearInterval(interval);
      socket.emit("leaveLeaderboard", leaderboardId);
      socket.off("rankingsUpdated");
    };
  }, [leaderboardId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (leaderboard) {
        const remaining = new Date(leaderboard.endDate).getTime() - Date.now();
        setTimeRemaining(Math.max(0, remaining));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [leaderboard]);

  const fetchLeaderboardDetails = async () => {
    try {
      const response = await api.get(`/api/manual-leaderboards/${leaderboardId}`);
      if (response.success) {
        setLeaderboard(response.data.leaderboard);
        setRankings(response.data.rankings);
        setUserRank(response.data.userRank);
        setTimeRemaining(response.data.timeRemaining);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Leaderboard not found</p>
          <Link href="/leaderboard" className="text-gold-500 hover:text-gold-400 text-sm">
            &larr; Back to Leaderboards
          </Link>
        </div>
      </div>
    );
  }

  const isEnded = leaderboard.status === "ended" || timeRemaining <= 0;
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);
  const podiumOrder: (1 | 2 | 3)[] = [2, 1, 3];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-8 transition-colors"
        >
          &larr; All Leaderboards
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-gray-500 text-xs font-semibold tracking-[0.2em] uppercase mb-2">
            Prize Pool
          </p>
          <h1 className="font-gaming text-5xl md:text-6xl font-bold text-gold-400 mb-3">
            {leaderboard.prizePool}
          </h1>
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">
            {leaderboard.title}
          </h2>
          {leaderboard.description && (
            <p className="text-gray-400 text-sm max-w-xl mx-auto mb-4">
              {leaderboard.description}
            </p>
          )}
          <div className="inline-flex items-center gap-3">
            {!isEnded && (
              <span className="inline-flex items-center gap-1.5 border border-gold-500/40 text-gold-400 text-xs font-semibold px-3 py-1 rounded tracking-wider">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LIVE RACE
              </span>
            )}
            {isEnded && (
              <span className="bg-gray-700/60 text-gray-400 text-xs font-semibold px-3 py-1 rounded tracking-wider">
                ENDED
              </span>
            )}
          </div>
        </motion.div>

        {/* Podium */}
        {rankings.length > 0 && (
          <>
            <div className="flex items-end gap-3 mb-6 max-w-3xl mx-auto">
              {podiumOrder.map((pos) => {
                const r = top3[pos - 1];
                if (!r) return <div key={pos} className="flex-1" />;
                return <PodiumCard key={pos} ranking={r} position={pos} />;
              })}
            </div>

            {/* Countdown */}
            <div className="text-center mb-10">
              <p className="text-gray-500 text-xs tracking-widest uppercase mb-1">
                Race Ends In
              </p>
              <p
                className={`font-gaming text-2xl font-bold ${isEnded ? "text-gray-500" : "text-white"}`}
              >
                {formatTimeRemaining(timeRemaining)}
              </p>
            </div>
          </>
        )}

        {/* User rank banner */}
        {userRank && (
          <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-gray-400 text-sm">
              Your current rank:{" "}
              <span className="text-white font-bold text-lg">#{userRank}</span>
            </p>
          </div>
        )}

        {/* Other participants */}
        {rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="inline-block border-b-2 border-gold-500 mb-4">
              <p className="text-white text-sm font-semibold tracking-wider uppercase pb-2">
                Other Participants
              </p>
            </div>

            <div className="bg-navy-800/50 border border-white/5 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 px-5 py-3 border-b border-white/5 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-3 text-right">Wagered</div>
                <div className="col-span-2 text-right">Prize</div>
              </div>

              {rest.map((ranking, i) => (
                <motion.div
                  key={ranking.userId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className={`grid grid-cols-12 px-5 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors ${
                    userRank === ranking.rank ? "bg-gold-500/5" : ""
                  }`}
                >
                  <div className="col-span-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-navy-900/80 border border-white/8 text-gray-400 text-xs font-bold">
                      {ranking.rank}
                    </span>
                  </div>

                  <div className="col-span-6 flex items-center gap-3">
                    <AvatarCircle username={ranking.username} size="sm" />
                    <span className="text-white font-medium text-sm truncate">
                      {maskUsername(ranking.username)}
                    </span>
                  </div>

                  <div className="col-span-3 text-right">
                    <span className="text-white font-semibold text-sm">
                      ${ranking.totalWagers.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="col-span-2 text-right">
                    {ranking.prize ? (
                      <span className="text-prize font-bold text-sm">
                        {ranking.prize}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {rankings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-2">No participants yet</p>
            <p className="text-gray-600 text-sm">
              Be the first to join the competition!
            </p>
          </div>
        )}

        {/* Fair Play Policy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5"
        >
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-yellow-400 font-semibold text-sm mb-2">
                Fair Play Policy — Wager Review
              </p>
              <p className="text-gray-400 text-xs mb-3">
                At the end of each race, all wagers will be reviewed for
                potential abuse.
              </p>
              <p className="text-yellow-600 text-xs font-semibold tracking-wider uppercase mb-2">
                Examples of wager abuse include:
              </p>
              <ul className="text-gray-500 text-xs space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">›</span>
                  Placing the majority of bets on Dice at 99%
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">›</span>
                  Using Limbo at 1.01x or similar low-risk strategies to
                  artificially inflate wager volume
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
