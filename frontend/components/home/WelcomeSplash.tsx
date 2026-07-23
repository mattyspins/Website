"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// First-impression takeover screen shown once per session on the homepage,
// per the approved "Aurora Background Redesign" mockup — the site's shared
// AuroraBackground is already running behind this at all times (it's mounted
// globally in layout.tsx), so this only needs its own opaque scrim + content,
// not a duplicate animated background. Auto-dismisses after 12s; the CTA
// button skips the wait immediately. Replaces the old logo-reveal IntroSplash.
//
// Deliberately not AnimatePresence-driven: the opacity fade runs via the
// `animate` prop while still mounted, and the component unmounts itself
// (returns null) via a plain timeout once that transition's duration has
// elapsed — the same technique the old IntroSplash used for its exit.
const EASE = [0.16, 1, 0.3, 1] as const;
const SESSION_KEY = "ms_welcome_seen";
const AUTO_DISMISS_MS = 12000;
const EXIT_DURATION = 0.6;

type Stage = "hidden" | "visible" | "exiting" | "done";

export default function WelcomeSplash() {
  const [stage, setStage] = useState<Stage>("hidden");
  // React 18 Strict Mode double-invokes effects in dev (effect → cleanup →
  // effect again) to surface non-idempotent ones. Reading sessionStorage
  // to decide "should I show" is NOT idempotent once the same effect body
  // also writes to it: the first invocation writes SESSION_KEY, then the
  // second invocation reads its own write back as "already seen" and the
  // splash never gets a chance to paint. This ref caches the decision after
  // the first invocation so the second invocation reuses it instead of
  // re-deriving it from sessionStorage — the timer setup below stays a
  // normal effect (safe to create/cleanup/recreate across the double-invoke).
  const decisionRef = useRef<"show" | "skip" | null>(null);

  useEffect(() => {
    if (decisionRef.current === null) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";
      decisionRef.current = reduceMotion || alreadySeen ? "skip" : "show";
      if (decisionRef.current === "show") sessionStorage.setItem(SESSION_KEY, "1");
    }

    if (decisionRef.current === "skip") {
      setStage("done");
      return;
    }

    setStage("visible");
    const timer = setTimeout(() => setStage("exiting"), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (stage !== "exiting") return;
    const timer = setTimeout(() => setStage("done"), EXIT_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [stage]);

  if (stage === "hidden" || stage === "done") return null;

  const exiting = stage === "exiting";

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_DURATION, ease: EASE }}
      className="fixed inset-0 z-[999] flex items-center justify-center px-6 text-center"
      style={{
        background: "radial-gradient(ellipse 120% 90% at 50% -10%, #171125 0%, #0a0810 45%, #07070b 100%)",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          className="font-gaming font-black text-sm tracking-[0.4em] text-accent-gold uppercase"
        >
          MattySpins
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
          className="font-gaming font-extrabold text-premtext-primary max-w-3xl"
          style={{ fontSize: "clamp(32px, 5vw, 58px)", lineHeight: 1.15 }}
        >
          Where the community plays, wins, and watches together
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
          className="text-premtext-secondary text-base max-w-md"
        >
          Points, raffles, and live drops — join in and start earning rewards.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
          onClick={() => setStage("exiting")}
          className="tap-target mt-2 font-semibold text-base px-8 py-3.5 rounded-xl text-navy-950 bg-gradient-to-r from-[#F7B52C] to-[#D97706] shadow-gold-lg motion-safe:hover:scale-105 transition-transform"
        >
          Enter the Community
        </motion.button>
      </div>
    </motion.div>
  );
}
