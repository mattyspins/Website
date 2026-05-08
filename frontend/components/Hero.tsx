"use client";

import { motion } from "framer-motion";
import { Play, Users, Calendar, ExternalLink, DollarSign } from "lucide-react";
import Link from "next/link";
import MattySpinsAvatar from "./MattySpinsAvatar";
import RainbetLogo from "./RainbetLogo";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-dark-200/20 to-gold-600/20 animate-pulse-slow" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-blue/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-gold/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "4s" }}
      />

      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
        {/* Logo/Avatar */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <MattySpinsAvatar size={180} />
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="hero-title text-6xl md:text-8xl font-bold mb-6 neon-text text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-blue-600 to-neon-gold"
        >
          MATTY SPINS
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="hero-subtitle text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Join MattySpins for the ultimate gaming experience with live streams,
          competitive leaderboards, and epic bonus hunts. Level up your gaming
          journey today.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
        >
          <a
            href="https://kick.com/mattyspinsslots"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow group bg-gradient-to-r from-neon-blue to-blue-600 hover:from-blue-600 hover:to-neon-gold text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 neon-glow"
          >
            <div className="flex items-center space-x-3">
              <Play className="w-6 h-6 group-hover:animate-pulse" />
              <span>Watch Live Stream</span>
              <ExternalLink className="w-5 h-5" />
            </div>
          </a>

          <a
            href="https://rainbet.com?r=mattyspins"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow group bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 neon-glow"
          >
            <div className="flex items-center space-x-3">
              <RainbetLogo
                width={32}
                height={32}
                animated={true}
                className="group-hover:animate-pulse"
              />
              <span>Join Rainbet</span>
              <ExternalLink className="w-5 h-5" />
            </div>
          </a>

          <a
            href="https://discord.gg/n2gCDVwebw"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow group glass border-2 border-neon-gold hover:bg-neon-gold/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 group-hover:animate-bounce" />
              <span>Join Community</span>
              <ExternalLink className="w-5 h-5" />
            </div>
          </a>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <Link
            href="/leaderboard"
            className="glass border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-4xl mb-3 group-hover:animate-bounce">🏆</div>
            <h3 className="text-xl font-bold text-white mb-2">Compete & Win</h3>
            <p className="text-gray-400 text-sm">
              Join leaderboards and compete for amazing prizes
            </p>
          </Link>

          <Link
            href="/bonus-hunt"
            className="glass border border-green-500/30 rounded-xl p-6 hover:border-green-400/50 transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-4xl mb-3 group-hover:animate-bounce">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Guess & Earn</h3>
            <p className="text-gray-400 text-sm">
              Predict bonus hunt outcomes and earn points
            </p>
          </Link>

          <Link
            href="/store"
            className="glass border border-blue-500/30 rounded-xl p-6 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-4xl mb-3 group-hover:animate-bounce">🛍️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Redeem Rewards
            </h3>
            <p className="text-gray-400 text-sm">
              Spend your points on exclusive items and prizes
            </p>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}
