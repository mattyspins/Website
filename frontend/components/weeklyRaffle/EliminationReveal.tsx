"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import Confetti from "@/components/highRoller/Confetti";
import Fireworks from "./Fireworks";
import { useWeeklyRaffleSound } from "@/lib/weeklyRaffleSound";
import type { WeeklyRaffleParticipant } from "@/lib/api/weeklyRaffle";

interface EliminationRevealProps {
  participants: WeeklyRaffleParticipant[];
  eliminationOrder: string[];
  weekNumber: number;
  drawDate: string;
  onFinished?: () => void;
}

function Avatar({ p, size = 56 }: { p: WeeklyRaffleParticipant; size?: number }) {
  return p.avatarUrl ? (
    <img
      src={p.avatarUrl}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-full object-cover ring-2 ring-white/10"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-white/10 flex items-center justify-center font-bold text-white/70"
    >
      {p.displayName[0]?.toUpperCase()}
    </div>
  );
}

// Delay grows as the pool shrinks — fast culling early, agonizing at the end.
function delayForStep(remaining: number): number {
  if (remaining > 40) return 90;
  if (remaining > 15) return 160;
  if (remaining > 6) return 380;
  if (remaining > 3) return 700;
  return 1300;
}

export default function EliminationReveal({
  participants,
  eliminationOrder,
  weekNumber,
  drawDate,
  onFinished,
}: EliminationRevealProps) {
  const { muted, toggleMute, play } = useWeeklyRaffleSound();
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const total = eliminationOrder.length;

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"running" | "winner">(total <= 1 ? "winner" : "running");

  const winnerId = eliminationOrder[total - 1];
  const winner = byId.get(winnerId);

  useEffect(() => {
    if (total <= 1) {
      play("winner");
      onFinished?.();
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    play("start");

    let cancelled = false;
    let i = 0;

    const step = () => {
      if (cancelled) return;
      i++;
      setStepIndex(i);
      const remaining = total - i;

      if (remaining <= 1) {
        setTimeout(
          () => {
            if (cancelled) return;
            setPhase("winner");
            play("winner");
            onFinished?.();
          },
          reduceMotion ? 50 : 700
        );
        return;
      }

      const intensity = 1 - remaining / total;
      play("tick", intensity);
      if (remaining <= 3) play("final");
      setTimeout(step, reduceMotion ? 20 : delayForStep(remaining));
    };

    setTimeout(step, reduceMotion ? 20 : 500);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eliminatedIds = new Set(eliminationOrder.slice(0, stepIndex));
  const visible = participants.filter((p) => !eliminatedIds.has(p.id));
  const progress = stepIndex / Math.max(1, total - 1);
  const zoomScale = 1 + Math.min(progress, 1) * 0.12;

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md overflow-y-auto">
      <button
        onClick={toggleMute}
        className="fixed top-4 right-4 z-[70] p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {phase === "running" && (
        <div className="min-h-screen flex flex-col items-center justify-center py-16 px-4">
          <p className="text-white/50 text-xs font-bold uppercase tracking-[0.3em] mb-1">Weekly Raffle Draw</p>
          <p className="text-white font-black text-2xl sm:text-3xl mb-8">{visible.length} remaining…</p>
          <motion.div
            animate={{ scale: zoomScale }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3 max-w-4xl"
          >
            <AnimatePresence mode="popLayout">
              {visible.map((p) => (
                <motion.div
                  key={p.id}
                  layoutId={`wr-participant-${p.id}`}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5, filter: "grayscale(1)" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <Avatar p={p} />
                  <p className="text-white/80 text-xs font-medium truncate max-w-[70px]">{p.displayName}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {phase === "winner" && winner && (
        <div className="min-h-screen flex items-center justify-center px-4">
          <Confetti durationMs={4500} />
          <Fireworks durationMs={4500} />
          <motion.div
            layoutId={`wr-participant-${winner.id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center relative z-[65]"
          >
            <p className="text-accent-gold text-2xl sm:text-3xl font-black tracking-widest mb-6">
              🎉 Weekly Raffle Winner 🎉
            </p>
            <div className="flex justify-center mb-5">
              <Avatar p={winner} size={140} />
            </div>
            <p className="text-white font-black text-3xl sm:text-4xl mb-2">{winner.displayName}</p>
            <p className="text-white/50 text-sm">
              Week {weekNumber} ·{" "}
              {new Date(drawDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
