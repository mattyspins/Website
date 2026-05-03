"use client";

import { motion } from "framer-motion";
import { TrendingUp, Trophy, Sparkles } from "lucide-react";

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

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Trophy className="w-16 h-16 text-yellow-400/50 mb-4" />
        </motion.div>

        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          No Highlights Yet
        </h3>
        <p className="text-gray-400 max-w-md">
          Recent wins and achievements will appear here once streaming begins!
        </p>

        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4" />
          <span>Check back during live streams</span>
        </div>
      </div>
    </motion.div>
  );
}
