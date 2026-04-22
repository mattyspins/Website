"use client";

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Zap, Trophy } from "lucide-react";

interface Highlight {
  id: number;
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
  bgColor: string;
}

const highlights: Highlight[] = [
  {
    id: 1,
    title: "Biggest Win",
    value: "$47,250",
    change: "+234%",
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
  },
  {
    id: 2,
    title: "Total Profit",
    value: "$128,940",
    change: "+18.5%",
    icon: DollarSign,
    color: "text-green-400",
    bgColor: "bg-green-400/20",
  },
  {
    id: 3,
    title: "Best Multiplier",
    value: "2,847x",
    change: "New Record!",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-pink-500/20",
  },
  {
    id: 4,
    title: "Win Rate",
    value: "73.2%",
    change: "+5.1%",
    icon: TrendingUp,
    color: "text-neon-gold",
    bgColor: "bg-blue-500/20",
  },
];

export default function RecentHighlights() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center space-x-3 mb-6">
        <TrendingUp className="w-6 h-6 text-neon-gold" />
        <h2 className="text-2xl font-bold">Recent Highlights</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {highlights.map((highlight, index) => (
          <motion.div
            key={highlight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
            className="group p-4 rounded-lg bg-gray-800/30 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${highlight.bgColor}`}>
                <highlight.icon className={`w-5 h-5 ${highlight.color}`} />
              </div>
              <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                24h
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {highlight.title}
              </h3>
              <div className="text-2xl font-bold text-white">
                {highlight.value}
              </div>
              <div className={`text-sm font-semibold ${highlight.color}`}>
                {highlight.change}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent activity feed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="mt-6 space-y-3"
      >
        <h3 className="text-lg font-semibold text-gray-300 mb-4">
          Latest Activity
        </h3>

        <div className="space-y-2">
          <div className="flex items-center space-x-3 p-3 bg-gray-800/20 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">
              Hit <span className="text-neon-gold font-semibold">847x</span> on
              Sweet Bonanza
            </span>
            <span className="text-xs text-gray-500 ml-auto">2m ago</span>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-800/20 rounded-lg">
            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
            <span className="text-sm text-gray-300">
              New follower milestone:{" "}
              <span className="text-neon-gold font-semibold">10,000</span>
            </span>
            <span className="text-xs text-gray-500 ml-auto">15m ago</span>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-800/20 rounded-lg">
            <div className="w-2 h-2 bg-purple-400 rounded-full" />
            <span className="text-sm text-gray-300">
              Started bonus hunt with{" "}
              <span className="text-blue-400 font-semibold">$5,000</span>
            </span>
            <span className="text-xs text-gray-500 ml-auto">1h ago</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
