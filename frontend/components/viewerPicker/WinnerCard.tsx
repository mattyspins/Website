"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Trash2, RotateCcw } from "lucide-react";
import Avatar from "./Avatar";
import type { PickerUser } from "@/lib/api/viewerPicker";

interface WinnerCardProps {
  winner: PickerUser;
  showButtons: boolean;
  onPickAnother?: () => void;
  onRemoveAndContinue?: (userId: string) => void;
  onReset?: () => void;
}

export default function WinnerCard({ winner, showButtons, onPickAnother, onRemoveAndContinue, onReset }: WinnerCardProps) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        top: 5 + Math.random() * 90,
        duration: 1.6 + Math.random(),
        delay: Math.random() * 1.5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 z-[65] pointer-events-none">
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative text-center max-w-sm w-full rounded-3xl px-8 py-9 backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/[0.03] border border-gold-400/30 shadow-[0_0_60px_-10px_rgba(250,204,21,0.35)] pointer-events-auto overflow-hidden"
      >
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            className="absolute w-1 h-1 rounded-full bg-gold-300"
            style={{ left: `${s.left}%`, top: `${s.top}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
            transition={{ duration: s.duration, repeat: Infinity, delay: s.delay }}
          />
        ))}

        <p className="text-gold-300 text-xl sm:text-2xl font-black tracking-[0.25em] uppercase mb-6">🏆 Winner</p>
        <div className="flex justify-center mb-5">
          <Avatar user={winner} size={130} ringClassName="ring-gold-400/50" />
        </div>
        <p className="text-white font-black text-3xl sm:text-4xl mb-1">{winner.displayName}</p>
        <p className="text-gold-200/70 text-sm font-semibold mb-7">Congratulations! 🎉</p>

        {showButtons && (
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
        )}
      </motion.div>
    </div>
  );
}
