"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MattySpinsMark from "./MattySpinsMark";

// Cinematic "expo-out" curve — smooth deceleration, no bounce.
const EASE = [0.16, 1, 0.3, 1] as const;
const SESSION_KEY = "ms_intro_seen";

type Stage = "black" | "logo" | "ring" | "slide" | "done";

export default function IntroSplash() {
  const [stage, setStage] = useState<Stage>("black");
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";

    if (reduceMotion || alreadySeen) {
      setSkip(true);
      setStage("done");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "1");

    const timers = [
      setTimeout(() => setStage("logo"), 60),
      setTimeout(() => setStage("ring"), 550),
      setTimeout(() => setStage("slide"), 950),
      setTimeout(() => setStage("done"), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (skip || stage === "done") return null;

  const logoVisible = stage === "logo" || stage === "ring";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] pointer-events-none">
        {/* Two panels — together they form the solid black screen, then slide apart */}
        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 bg-black"
          initial={{ x: 0 }}
          animate={{ x: stage === "slide" ? "-100%" : 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 w-1/2 bg-black"
          initial={{ x: 0 }}
          animate={{ x: stage === "slide" ? "100%" : 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        />

        {/* Logo, centered on top of the panels */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: logoVisible ? 1 : 0,
              scale: logoVisible ? 1 : 0.85,
            }}
            transition={{ duration: logoVisible ? 0.5 : 0.2, ease: EASE }}
            style={{ filter: "drop-shadow(0 0 28px rgba(21,101,216,0.55))" }}
          >
            <MattySpinsMark
              size={110}
              showRing={stage === "ring" || stage === "slide"}
              ringClassName={stage === "ring" ? "animate-ring-rotate" : ""}
            />
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
