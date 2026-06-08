"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function RewardsPage() {
  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-10">
          <div className="w-14 h-14 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-yellow-400" />
          </div>
          <h1 className="text-white font-bold text-2xl mb-3">Program Ended</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            The deposit bonus program is no longer active. Stay tuned to the Discord server for future promotions and giveaways.
          </p>
          <a
            href="https://discord.gg/n2gCDVwebw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Join Discord
          </a>
        </div>
      </motion.div>
    </div>
  );
}
