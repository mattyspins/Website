"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, Trash2, Play } from "lucide-react";
import Confetti from "@/components/highRoller/Confetti";
import Fireworks from "@/components/weeklyRaffle/Fireworks";
import CannonParticles from "./CannonParticles";
import { useViewerPickerSound } from "@/lib/viewerPickerSound";
import type { PickerEntry, PickerUser } from "@/lib/api/viewerPicker";

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_IDLE_ORBS = 48;

interface RandomizerCannonProps {
  entries: PickerEntry[];
  // Set by the parent right after the server has already committed a winner — the
  // animation only ever replays this known result, it never decides the outcome.
  winner: PickerUser | null;
  onRevealComplete?: () => void;
  onPickAnother?: () => void;
  onRemoveAndContinue?: (userId: string) => void;
  onReset?: () => void;
  compact?: boolean;
}

function Avatar({ user, size = 44 }: { user: { displayName: string; avatarUrl: string | null }; size?: number }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-cyan-400/30" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white ring-2 ring-cyan-400/30"
    >
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function CannonGraphic({ charging, angle }: { charging: boolean; angle: number }) {
  return (
    <motion.svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      animate={{ rotate: angle }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{ transformOrigin: "70px 100px" }}
    >
      <defs>
        <radialGradient id="cannonCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0f7ff" />
          <stop offset="40%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <linearGradient id="cannonBarrel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* base */}
      <ellipse cx="70" cy="112" rx="34" ry="12" fill="#0f172a" stroke="#22d3ee" strokeOpacity="0.35" />
      {/* barrel */}
      <rect x="52" y="30" width="36" height="80" rx="14" fill="url(#cannonBarrel)" stroke="#a855f7" strokeOpacity="0.5" strokeWidth="1.5" />
      {/* muzzle ring */}
      <ellipse cx="70" cy="32" rx="20" ry="8" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.5" />
      {/* glowing core */}
      <motion.circle
        cx="70" cy="34" r={charging ? 13 : 9}
        fill="url(#cannonCore)"
        animate={{ opacity: charging ? [0.7, 1, 0.7] : 0.85, r: charging ? [9, 15, 9] : 9 }}
        transition={{ duration: charging ? 0.5 : 0, repeat: charging ? Infinity : 0, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export default function RandomizerCannon({
  entries,
  winner,
  onRevealComplete,
  onPickAnother,
  onRemoveAndContinue,
  onReset,
  compact = false,
}: RandomizerCannonProps) {
  const { muted, toggleMute, play } = useViewerPickerSound();
  const [phase, setPhase] = useState<"idle" | "charging" | "firing" | "reveal">("idle");
  const [angle, setAngle] = useState(0);
  const [shuffleName, setShuffleName] = useState("");

  const names = useMemo(() => entries.map((e) => e.user.displayName), [entries]);
  const visibleEntries = entries.slice(-MAX_IDLE_ORBS);
  const overflowCount = Math.max(0, entries.length - MAX_IDLE_ORBS);

  useEffect(() => {
    if (!winner) {
      setPhase("idle");
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPhase("reveal");
      play("winner");
      onRevealComplete?.();
      return;
    }

    let cancelled = false;
    setPhase("charging");
    play("powerup");

    let shuffleTimer: ReturnType<typeof setInterval> | null = null;
    if (names.length > 0) {
      shuffleTimer = setInterval(() => {
        setShuffleName(names[Math.floor(Math.random() * names.length)]);
        play("shuffle");
      }, 80);
    }

    const t1 = setTimeout(() => {
      if (cancelled) return;
      setAngle(-35 + Math.random() * 70);
    }, 700);

    const t2 = setTimeout(() => {
      if (cancelled) return;
      if (shuffleTimer) clearInterval(shuffleTimer);
      setPhase("firing");
      play("fire");
    }, 1200);

    const t3 = setTimeout(() => {
      if (cancelled) return;
      setPhase("reveal");
      play("winner");
      onRevealComplete?.();
    }, 1600);

    return () => {
      cancelled = true;
      if (shuffleTimer) clearInterval(shuffleTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  return (
    <div className="relative">
      {/* Idle scene — always visible */}
      <div className={`relative rounded-2xl border border-cyan-500/20 bg-[#0a0e17] overflow-hidden ${compact ? "h-56" : "h-[420px]"}`}>
        <CannonParticles />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <CannonGraphic charging={phase === "charging"} angle={phase === "idle" || phase === "reveal" ? 0 : angle} />
          <p className="text-cyan-300/60 text-[11px] uppercase tracking-widest font-semibold">
            {entries.length} entered
          </p>
        </div>

        {/* Floating orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {visibleEntries.map((e, i) => {
              const angleRad = (i / Math.max(1, visibleEntries.length)) * Math.PI * 2;
              const radius = compact ? 70 : 150;
              const cx = 50 + Math.cos(angleRad) * (radius / 3.6);
              const cy = 50 + Math.sin(angleRad) * (radius / 3.6) * 0.7;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.3 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                  title={e.user.displayName}
                />
              );
            })}
          </AnimatePresence>
        </div>
        {overflowCount > 0 && (
          <p className="absolute bottom-3 right-3 text-cyan-400/50 text-[10px] font-semibold">+{overflowCount} more</p>
        )}
      </div>

      {/* Picking / reveal overlay */}
      <AnimatePresence>
        {phase !== "idle" && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#05070d]/95 backdrop-blur-md flex items-center justify-center px-4"
          >
            <button
              onClick={toggleMute}
              className="fixed top-4 right-4 z-[70] p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {(phase === "charging" || phase === "firing") && (
              <div className="text-center">
                <CannonGraphic charging={phase === "charging"} angle={angle} />
                <p className="text-cyan-300 font-black text-2xl mt-6 tracking-widest uppercase tabular-nums">
                  {shuffleName || "…"}
                </p>
                {phase === "firing" && (
                  <motion.div
                    initial={{ scale: 0.4, opacity: 1 }}
                    animate={{ scale: 8, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-8 h-8 rounded-full bg-cyan-300 mx-auto mt-6 shadow-[0_0_40px_16px_rgba(34,211,238,0.7)]"
                  />
                )}
              </div>
            )}

            {phase === "reveal" && (
              <>
                <Confetti durationMs={4500} colors={["#22d3ee", "#a855f7", "#38bdf8", "#ffffff", "#c084fc"]} />
                <Fireworks durationMs={4500} colors={["#22d3ee", "#a855f7", "#38bdf8", "#ffffff"]} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-center relative z-[65]"
                >
                  <p className="text-cyan-300 text-xl sm:text-2xl font-black tracking-[0.2em] uppercase mb-6">Winner!</p>
                  <div className="flex justify-center mb-5">
                    <Avatar user={winner} size={140} />
                  </div>
                  <p className="text-white font-black text-3xl sm:text-4xl mb-8">{winner.displayName}</p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {onPickAnother && (
                      <button
                        onClick={onPickAnother}
                        className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Pick Another
                      </button>
                    )}
                    {onRemoveAndContinue && (
                      <button
                        onClick={() => onRemoveAndContinue(winner.id)}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove &amp; Continue
                      </button>
                    )}
                    {onReset && (
                      <button
                        onClick={onReset}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Giveaway
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
