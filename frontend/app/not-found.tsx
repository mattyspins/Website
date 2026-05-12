"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";
import MattySpinsAvatar from "@/components/MattySpinsAvatar";

export default function NotFound() {
  return (
    <div className="min-h-screen  flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Animated 404 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 mb-4">
            404
          </div>
          <MattySpinsAvatar size={120} />
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            The page you're looking for seems to have vanished into the void.
            Maybe it's on a bonus hunt of its own!
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/"
            className="btn-glow group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
          >
            <Home className="w-5 h-5 group-hover:animate-pulse" />
            <span>Back to Home</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="btn-glow group glass border-2 border-gray-600 hover:border-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5 group-hover:animate-pulse" />
            <span>Go Back</span>
          </button>
        </motion.div>

        {/* Helpful Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-12 p-6 bg-black/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center justify-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Looking for something specific?</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Link
              href="/leaderboard"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ðŸ† Leaderboards
            </Link>
            <Link
              href="/bonus-hunt"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ðŸŽ¯ Bonus Hunt
            </Link>
            <Link
              href="/store"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ðŸ›’ Store
            </Link>
            <Link
              href="/raffle"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ðŸŽŸï¸ Raffles
            </Link>
          </div>
        </motion.div>

        {/* Fun Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-8 text-gray-500 text-sm"
        >
          <p>
            "Even the best gamblers sometimes bet on the wrong URL!" -
            MattySpins
          </p>
        </motion.div>
      </div>
    </div>
  );
}

