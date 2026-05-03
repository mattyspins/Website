"use client";

import { motion } from "framer-motion";
import { Radio } from "lucide-react";

export default function LiveStatus() {
  // Stream status will be managed by admin in future updates
  // For now, showing offline state - admin can update stream links manually
  const isLive = false;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
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

        <p className="text-sm text-gray-500">
          Follow MattySpins on Kick for live stream notifications
        </p>
      </div>
    </motion.div>
  );
}
