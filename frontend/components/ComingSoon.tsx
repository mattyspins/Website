"use client";

import { motion } from "framer-motion";
import { Rocket, Clock, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: "rocket" | "clock" | "sparkles";
}

export default function ComingSoon({
  title,
  description = "This feature is currently under development and will be available soon!",
  icon = "rocket",
}: ComingSoonProps) {
  const icons = {
    rocket: Rocket,
    clock: Clock,
    sparkles: Sparkles,
  };

  const Icon = icons[icon];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-50 rounded-full"></div>
            <Icon className="w-32 h-32 text-purple-400 relative z-10" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
        >
          {title}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-gray-300 mb-8"
        >
          {description}
        </motion.p>

        {/* Coming Soon Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="inline-block"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-full">
            <span className="text-white font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              COMING SOON
              <Sparkles className="w-5 h-5" />
            </span>
          </div>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex justify-center gap-4"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 bg-purple-400 rounded-full"
            />
          ))}
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <a
            href="/"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
          >
            ← Back to Home
          </a>
        </motion.div>

        {/* Additional Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-gray-500 text-sm"
        >
          Stay tuned for updates! Follow us on Discord for the latest news.
        </motion.p>
      </motion.div>
    </div>
  );
}
