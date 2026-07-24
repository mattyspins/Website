"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play, ExternalLink, Users, Trophy, Coins, Target } from "lucide-react";
import Link from "next/link";

// Cinematic "expo-out" curve — matches WelcomeSplash, no bounce.
const EASE = [0.16, 1, 0.3, 1] as const;
// Hero content starts revealing right as the intro splash's panels clear.
const REVEAL_DELAY = 0.45;

export default function Hero() {
  // Users who ask for reduced motion get the content immediately and in place —
  // no clip-path wipe, no stagger, no delay. Content still appears; only the
  // movement is dropped.
  const reduce = useReducedMotion();
  const delay = (d: number) => (reduce ? 0 : d);
  const rise = (y: number) =>
    reduce ? { opacity: 1, y: 0 } : { opacity: 0, y };

  return (
    <motion.section
      initial={reduce ? false : { clipPath: "inset(0% 50% 0% 50%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: reduce ? 0 : 0.6, delay: delay(REVEAL_DELAY), ease: EASE }}
      // pb-32 reserves room for the absolutely-positioned scroll indicator and
      // stops the feature cards butting against the next section. min-h-screen
      // is a floor, not a cap — the section grows past it on short viewports,
      // so the content must carry its own padding rather than rely on slack.
      className="min-h-screen flex items-center justify-center relative overflow-hidden pt-24 pb-32"
    >
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Partner badge */}
        <motion.div
          initial={rise(16)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(REVEAL_DELAY + 0.1), duration: 0.4, ease: EASE }}
          className="inline-flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/25 rounded-full px-4 py-1.5 text-sm text-accent-silver font-medium mb-8 backdrop-blur-sm"
        >
          <span className="w-2 h-2 bg-accent-gold rounded-full motion-safe:animate-pulse" />
          Official Razed Partner
        </motion.div>

        {/* Heading — the wordmark stays as the visual anchor, but the promise
            now carries equal weight so a first-time visitor learns the offer,
            not just the brand name. */}
        <motion.h1
          initial={rise(24)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(REVEAL_DELAY + 0.1), duration: 0.4, ease: EASE }}
          className="font-gaming text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-5 tracking-tight"
        >
          <span className="text-premtext-primary">MATTY</span>
          <span className="text-accent-gold" style={{ textShadow: "0 0 24px rgba(247,181,44,0.35)" }}>
            SPINS
          </span>
        </motion.h1>

        <motion.p
          initial={rise(18)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(REVEAL_DELAY + 0.15), duration: 0.4, ease: EASE }}
          className="text-premtext-primary text-xl md:text-3xl font-semibold mb-4 max-w-3xl mx-auto text-balance"
        >
          Watch, play, and earn — turn stream time into rewards.
        </motion.p>

        <motion.p
          initial={rise(16)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(REVEAL_DELAY + 0.2), duration: 0.4, ease: EASE }}
          className="text-premtext-secondary text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Earn Matty Coins just for watching on Kick. Compete on live wager
          leaderboards, play stream games, and redeem your Matty Coins for exclusive
          rewards.
        </motion.p>

        {/* CTA buttons — one filled primary (the on-site action that actually
            converts a viewer into a member); everything else is secondary or a
            quiet outbound link. */}
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay(REVEAL_DELAY + 0.3), duration: 0.4, ease: EASE }}
          className="flex flex-col items-center gap-4 mb-16"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="https://kick.com/mattyspinsslots"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow tap-target inline-flex items-center gap-2 bg-[#53FC18] hover:bg-[#45D615] text-black px-7 py-3.5 rounded-2xl font-semibold text-base transition-all motion-safe:hover:scale-105"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Watch Live
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">(opens Kick in a new tab)</span>
            </a>

            <a
              href="https://discord.gg/n2gCDVwebw"
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex items-center gap-2 border border-white/12 bg-white/5 hover:bg-white/10 text-premtext-primary px-6 py-3.5 rounded-2xl font-medium text-sm transition-colors"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              Join Discord
              <ExternalLink className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
              <span className="sr-only">(opens Discord in a new tab)</span>
            </a>
          </div>

          {/* The affiliate CTA is separated from the community CTAs and carries
              its own 18+ / responsible-play disclosure, so the gambling link is
              never presented as a casual peer of "Watch Live". */}
          <div className="flex flex-col items-center gap-1.5 mt-1">
            <a
              href="https://www.razed.com/signup/?raf=Mattyspins"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="premium-gold-hover tap-target inline-flex items-center gap-2 border border-accent-gold/35 bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              <span className="font-gaming font-bold text-base" aria-hidden="true">R</span>
              Play on Razed
              <ExternalLink className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
              <span className="sr-only">(affiliate link, opens Razed in a new tab)</span>
            </a>
            <p className="text-xs text-premtext-secondary/70 flex items-center gap-1.5">
              <span className="border border-red-500/40 text-red-400 font-bold px-1.5 rounded text-[10px]">18+</span>
              Affiliate link. Gamble responsibly —{" "}
              <Link href="/responsible-gaming" className="underline underline-offset-2 hover:text-premtext-primary transition-colors">
                get support
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { href: "/leaderboard", icon: Trophy, title: "Leaderboard", desc: "Compete for cash prizes in monthly wager races" },
            { href: "/bonus-hunt", icon: Target, title: "Guess the Balance", desc: "Predict bonus hunt endings and earn Matty Coins" },
            { href: "/store", icon: Coins, title: "Matty Coin Store", desc: "Spend your Matty Coins on exclusive drops and rewards" },
          ].map(({ href, icon: Icon, title, desc }, i) => (
            <motion.div
              key={href}
              initial={rise(20)}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay(REVEAL_DELAY + 0.4 + i * 0.08), duration: 0.4, ease: EASE }}
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

      {/* Scroll indicator — decorative, so hidden from assistive tech. */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay(REVEAL_DELAY + 0.8), duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-5 h-8 border border-accent-silver/25 rounded-full flex justify-center">
          <div className="w-0.5 h-2 bg-accent-gold/60 rounded-full mt-2 motion-safe:animate-bounce" />
        </div>
      </motion.div>
    </motion.section>
  );
}
