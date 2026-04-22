"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { useState } from "react";

interface LeaderboardUser {
  id: number;
  name: string;
  points: number;
  wins: number;
  avatar: string;
  rank: number;
  change: number;
}

const mockUsers: LeaderboardUser[] = [
  {
    id: 1,
    name: "GamingLegend",
    points: 15420,
    wins: 89,
    avatar: "🏆",
    rank: 1,
    change: 2,
  },
  {
    id: 2,
    name: "StreamKing",
    points: 14890,
    wins: 76,
    avatar: "👑",
    rank: 2,
    change: -1,
  },
  {
    id: 3,
    name: "NeonGamer",
    points: 13650,
    wins: 68,
    avatar: "⚡",
    rank: 3,
    change: 1,
  },
  {
    id: 4,
    name: "PixelMaster",
    points: 12340,
    wins: 54,
    avatar: "🎮",
    rank: 4,
    change: 0,
  },
  {
    id: 5,
    name: "CyberNinja",
    points: 11890,
    wins: 49,
    avatar: "🥷",
    rank: 5,
    change: 3,
  },
  {
    id: 6,
    name: "ElitePlayer",
    points: 10560,
    wins: 42,
    avatar: "🔥",
    rank: 6,
    change: -2,
  },
  {
    id: 7,
    name: "ProGamer99",
    points: 9870,
    wins: 38,
    avatar: "💎",
    rank: 7,
    change: 1,
  },
  {
    id: 8,
    name: "StreamSniper",
    points: 9120,
    wins: 35,
    avatar: "🎯",
    rank: 8,
    change: -1,
  },
];

export default function Leaderboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("weekly");

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="text-2xl font-bold text-gray-400">#{rank}</span>
        );
    }
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-400">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span>+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-400">
          <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
          <span>{change}</span>
        </div>
      );
    }
    return <span className="text-gray-400">-</span>;
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 neon-text text-neon-gold">
            LEADERBOARD
          </h1>
          <p className="text-xl text-gray-300">
            Compete with the best and climb to the top
          </p>
        </motion.div>

        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="glass rounded-lg p-1">
            {["daily", "weekly", "monthly", "all-time"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-6 py-2 rounded-md transition-all duration-300 ${
                  selectedPeriod === period
                    ? "bg-neon-gold text-black font-bold"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {period.charAt(0).toUpperCase() +
                  period.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {mockUsers.slice(0, 3).map((user, index) => (
            <div
              key={user.id}
              className={`glass rounded-xl p-6 text-center relative overflow-hidden ${
                index === 0
                  ? "md:order-2 transform md:scale-110"
                  : index === 1
                    ? "md:order-1"
                    : "md:order-3"
              }`}
            >
              <div
                className={`absolute inset-0 opacity-20 ${
                  index === 0
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                    : index === 1
                      ? "bg-gradient-to-br from-gray-300 to-gray-500"
                      : "bg-gradient-to-br from-amber-600 to-yellow-700"
                }`}
              />

              <div className="relative z-10">
                <div className="text-6xl mb-4">{user.avatar}</div>
                <div className="flex justify-center mb-2">
                  {getRankIcon(user.rank)}
                </div>
                <h3 className="text-xl font-bold mb-2">{user.name}</h3>
                <div className="text-2xl font-bold text-neon-blue mb-1">
                  {user.points.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">{user.wins} wins</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Full Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="glass rounded-xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold">Full Rankings</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left">Rank</th>
                  <th className="px-6 py-4 text-left">Player</th>
                  <th className="px-6 py-4 text-right">Points</th>
                  <th className="px-6 py-4 text-right">Wins</th>
                  <th className="px-6 py-4 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                    className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getRankIcon(user.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{user.avatar}</span>
                        <span className="font-semibold">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-neon-blue">
                      {user.points.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">{user.wins}</td>
                    <td className="px-6 py-4 text-right">
                      {getChangeIndicator(user.change)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
