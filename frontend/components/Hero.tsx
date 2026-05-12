"use client";

import { motion } from "framer-motion";
import { Play, ExternalLink, Users, Trophy, Coins, Target } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gold-600/6 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl animate-float" />
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gold-700/4 rounded-full blur-3xl" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Partner badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/25 rounded-full px-4 py-1.5 text-sm text-gold-400 font-medium mb-8"
        >
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Official AceBet Partner
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="font-gaming text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight"
        >
          <span className="text-white">MATTY</span>
          <span className="text-gold-400 neon-text">SPINS</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Compete on the leaderboard, guess bonus hunt balances, and redeem
          your coins for exclusive rewards.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-wrap gap-3 justify-center mb-16"
        >
          <a
            href="https://kick.com/mattyspinsslots"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow inline-flex items-center gap-2 bg-[#53FC18] hover:bg-[#45D615] text-black px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
          >
            <Play className="w-4 h-4" />
            Watch Live
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://acebet.co/welcome/r/mattyspins"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-black px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105 neon-glow"
          >
            <span className="font-gaming font-bold text-base">A</span>
            Play on AceBet
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://discord.gg/n2gCDVwebw"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
          >
            <Users className="w-4 h-4" />
            Join Discord
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
        >
          <Link
            href="/leaderboard"
            className="group bg-navy-800/50 border border-gold-500/10 rounded-xl p-5 text-left hover:border-gold-500/35 transition-all card-hover"
          >
            <Trophy className="w-7 h-7 text-gold-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-semibold mb-1">Leaderboard</h3>
            <p className="text-gray-500 text-sm">
              Compete for cash prizes in monthly wager races
            </p>
          </Link>

          <Link
            href="/bonus-hunt"
            className="group bg-navy-800/50 border border-gold-500/10 rounded-xl p-5 text-left hover:border-gold-500/35 transition-all card-hover"
          >
            <Target className="w-7 h-7 text-gold-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-semibold mb-1">Guess the Balance</h3>
            <p className="text-gray-500 text-sm">
              Predict bonus hunt endings and earn coins
            </p>
          </Link>

          <Link
            href="/store"
            className="group bg-navy-800/50 border border-gold-500/10 rounded-xl p-5 text-left hover:border-gold-500/35 transition-all card-hover"
          >
            <Coins className="w-7 h-7 text-gold-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-semibold mb-1">Coin Store</h3>
            <p className="text-gray-500 text-sm">
              Spend your coins on exclusive drops and rewards
            </p>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-5 h-8 border border-gold-500/20 rounded-full flex justify-center">
          <div className="w-0.5 h-2 bg-gold-500/40 rounded-full mt-2 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}
