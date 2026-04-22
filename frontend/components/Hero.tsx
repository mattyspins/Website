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

        {/* Partnership Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-8"
        >
          <div className="glass rounded-2xl px-8 py-4 inline-block border-2 border-neon-gold/30">
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-neon-gold">
                MattySpins
              </span>
              <span className="text-3xl">✕</span>
              <div className="flex items-center space-x-2">
                <RainbetLogo width={40} height={40} animated={true} />
                <span className="text-2xl font-bold text-cyan-400">
                  Rainbet
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-400 text-center mt-1">
              Official Partnership
            </div>
          </div>
        </motion.div>

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
          <button className="btn-glow group bg-gradient-to-r from-neon-blue to-blue-600 hover:from-blue-600 hover:to-neon-gold text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 neon-glow">
            <div className="flex items-center space-x-3">
              <Play className="w-6 h-6 group-hover:animate-pulse" />
              <span>Watch Live Stream</span>
              <ExternalLink className="w-5 h-5" />
            </div>
          </button>

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

          <Link href="/leaderboard">
            <button className="btn-glow group glass border-2 border-neon-gold hover:bg-neon-gold/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 group-hover:animate-bounce" />
                <span>Join Community</span>
              </div>
            </button>
          </Link>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
            <div className="text-3xl font-bold text-neon-blue mb-2">24/7</div>
            <div className="text-gray-300">Live Streaming</div>
          </div>

          <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
            <div className="text-3xl font-bold text-neon-gold mb-2">10K+</div>
            <div className="text-gray-300">Active Members</div>
          </div>

          <div className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
            <div className="text-3xl font-bold text-blue-400 mb-2">$1M+</div>
            <div className="text-gray-300">Total Winnings</div>
          </div>
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
