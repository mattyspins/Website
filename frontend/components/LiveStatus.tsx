"use client";

import { motion } from "framer-motion";
import { Radio, Users, Eye, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function LiveStatus() {
  const [isLive, setIsLive] = useState(true);
  const [viewers, setViewers] = useState(1247);
  const [uptime, setUptime] = useState("2:34:15");

  // Simulate live viewer count changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive) {
        setViewers((prev) => prev + Math.floor(Math.random() * 10) - 5);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
      {isLive ? (
        <div className="glass rounded-2xl p-8 max-w-2xl mx-auto relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 animate-pulse" />

          <div className="relative z-10">
            {/* Live indicator */}
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-3 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg">
                <Radio className="w-6 h-6 animate-pulse" />
                <span>LIVE NOW</span>
              </div>
            </div>

            {/* Stream title */}
            <h2 className="text-3xl font-bold mb-4 text-white">
              🎰 MEGA BONUS HUNT - Going for 1000x! 🚀
            </h2>

            {/* Stream stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-center space-x-2 text-gray-300">
                <Eye className="w-5 h-5 text-neon-gold" />
                <span className="font-semibold">
                  {viewers.toLocaleString()}
                </span>
                <span>viewers</span>
              </div>

              <div className="flex items-center justify-center space-x-2 text-gray-300">
                <Clock className="w-5 h-5 text-neon-gold" />
                <span className="font-semibold">{uptime}</span>
                <span>uptime</span>
              </div>

              <div className="flex items-center justify-center space-x-2 text-gray-300">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="font-semibold">Gaming</span>
                <span>category</span>
              </div>
            </div>

            {/* Watch button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-6 btn-glow bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-500 hover:to-red-500 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 neon-glow"
            >
              🔴 WATCH LIVE
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
          <div className="text-gray-400 mb-4">
            <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
          </div>

          <h2 className="text-2xl font-bold mb-4 text-gray-300">
            Stream Offline
          </h2>

          <p className="text-gray-400 mb-6">
            The stream is currently offline. Check back later or follow for
            notifications!
          </p>

          <div className="text-sm text-gray-500">Last stream: 2 hours ago</div>
        </div>
      )}
    </motion.div>
  );
}
