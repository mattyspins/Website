"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, ExternalLink, Users, Trophy, Coins, Target } from "lucide-react";
import Link from "next/link";
import HeroParticles from "./home/HeroParticles";

// Cinematic "expo-out" curve — matches IntroSplash, no bounce.
const EASE = [0.16, 1, 0.3, 1] as const;
// Hero content starts revealing right as the intro splash's panels clear (~0.9s in).
const REVEAL_DELAY = 0.9;

export default function Hero() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let raf = 0;
    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = glowRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <motion.section
      initial={{ clipPath: "inset(0% 50% 0% 50%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 0.6, delay: REVEAL_DELAY, ease: EASE }}
      className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16 bg-ink"
    >
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-accent-blue/12 blur-[120px] animate-mesh-drift" />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-accent-blue/8 blur-[130px] animate-mesh-drift"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[30vw] h-[30vw] rounded-full bg-accent-gold/5 blur-[100px] animate-mesh-drift"
          style={{ animationDelay: "-11s" }}
        />
      </div>

      {/* Light rays */}
      <div className="absolute inset-0 overflow-hidden opacity-60">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[60%] animate-ray-sweep"
          style={{
            background:
              "conic-gradient(from 200deg at 50% 0%, transparent 0deg, rgba(21,101,216,0.10) 10deg, transparent 24deg, transparent 336deg, rgba(21,101,216,0.10) 350deg, transparent 360deg)",
          }}
        />
      </div>

      {/* Faint geometric dot pattern, fading toward edges */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(rgba(216,216,221,0.5) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 75%)",
        }}
      />

      {/* Soft floating particles */}
      <HeroParticles />

      {/* Mouse-following radial glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={
          {
            "--mx": "50%",
            "--my": "40%",
            background:
              "radial-gradient(500px circle at var(--mx) var(--my), rgba(21,101,216,0.14), transparent 65%)",
          } as React.CSSProperties
        }
      />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Partner badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: REVEAL_DELAY + 0.1, duration: 0.4, ease: EASE }}
          className="inline-flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/25 rounded-full px-4 py-1.5 text-sm text-accent-silver font-medium mb-8 backdrop-blur-sm"
        >
          <span className="w-2 h-2 bg-accent-gold rounded-full animate-pulse" />
          Official Razed Partner
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: REVEAL_DELAY + 0.1, duration: 0.4, ease: EASE }}
          className="font-gaming text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight"
        >
          <span className="text-premtext-primary">MATTY</span>
          <span className="text-accent-gold" style={{ textShadow: "0 0 24px rgba(247,181,44,0.35)" }}>
            SPINS
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: REVEAL_DELAY + 0.2, duration: 0.4, ease: EASE }}
          className="text-premtext-secondary text-base md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Compete on the leaderboard, guess bonus hunt balances, and redeem
          your coins for exclusive rewards.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: REVEAL_DELAY + 0.3, duration: 0.4, ease: EASE }}
          className="flex flex-wrap gap-3 justify-center mb-16"
        >
          <a
            href="https://kick.com/mattyspinsslots"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow inline-flex items-center gap-2 bg-[#53FC18] hover:bg-[#45D615] text-black px-6 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-105"
          >
            <Play className="w-4 h-4" />
            Watch Live
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://www.razed.com/signup/?raf=Mattyspins"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow premium-gold-hover inline-flex items-center gap-2 bg-accent-gold hover:brightness-110 text-black px-6 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-105"
          >
            <span className="font-gaming font-bold text-base">R</span>
            Play on Razed
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://discord.gg/n2gCDVwebw"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-105"
          >
            <Users className="w-4 h-4" />
            Join Discord
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { href: "/leaderboard", icon: Trophy, title: "Leaderboard", desc: "Compete for cash prizes in monthly wager races" },
            { href: "/bonus-hunt", icon: Target, title: "Guess the Balance", desc: "Predict bonus hunt endings and earn coins" },
            { href: "/store", icon: Coins, title: "Coin Store", desc: "Spend your coins on exclusive drops and rewards" },
          ].map(({ href, icon: Icon, title, desc }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: REVEAL_DELAY + 0.4 + i * 0.08, duration: 0.4, ease: EASE }}
            >
              <Link
                href={href}
                className="premium-card group block bg-ink-card/80 border border-white/8 rounded-2xl p-5 text-left transition-all"
              >
                <Icon className="w-7 h-7 text-accent-silver mb-3 group-hover:text-accent-gold group-hover:scale-110 transition-all" />
                <h3 className="text-premtext-primary font-semibold mb-1">{title}</h3>
                <p className="text-premtext-secondary text-sm">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: REVEAL_DELAY + 0.8, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-5 h-8 border border-accent-silver/25 rounded-full flex justify-center">
          <div className="w-0.5 h-2 bg-accent-gold/60 rounded-full mt-2 animate-bounce" />
        </div>
      </motion.div>
    </motion.section>
  );
}
