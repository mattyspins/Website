"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";

interface Props {
  championName: string;
  /** Prefilled from the tournament's current rewardConfig — usually the defaults. */
  defaults: { first: string; second: string; third: string };
  onConfirm: (rewards: { "1": number; "2": number; "3": number }) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Asks the admin how many coins to award 1st/2nd/3rd before the tournament is
 * marked COMPLETED — this is the deliberate stop the auto-complete used to
 * skip, so payouts always go out on purpose rather than off a stale default.
 */
export default function SlotWorldCupFinishModal({ championName, defaults, onConfirm, onCancel, loading = false }: Props) {
  const [first, setFirst] = useState(defaults.first);
  const [second, setSecond] = useState(defaults.second);
  const [third, setThird] = useState(defaults.third);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    firstFieldRef.current?.select();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) { onCancel(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, loading]);

  const parsed = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const valid = parsed(first) !== null && parsed(second) !== null && parsed(third) !== null;

  const field = (label: string, value: string, setValue: (v: string) => void, accent: string) => (
    <label className="block">
      <span className="text-xs text-white/50 mb-1 block">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: accent }}>🪙</span>
        <input
          type="number" min="0" step="1" value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400/50"
        />
      </div>
    </label>
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
      >
        <motion.div
          ref={panelRef}
          role="dialog" aria-modal="true" aria-labelledby={titleId}
          initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
          className="bg-gradient-to-br from-[#151922] to-[#0d0f15] border border-yellow-400/25 rounded-2xl p-6 w-full max-w-sm"
        >
          <div className="flex justify-center mb-3">
            <div className="bg-yellow-400/15 rounded-full p-3">
              <Trophy className="w-7 h-7 text-yellow-400" />
            </div>
          </div>
          <h2 id={titleId} className="text-xl font-bold text-white text-center mb-1">End World Cup?</h2>
          <p className="text-white/50 text-sm text-center mb-5">
            <span className="text-yellow-300 font-semibold">{championName}</span> will be crowned champion.
            Set the Matty Coin reward for each place — this pays out immediately once confirmed.
          </p>

          <div className="space-y-3 mb-6">
            {field("🥇 1st place", first, setFirst, "#FFD54A")}
            {field("🥈 2nd place", second, setSecond, "#C9CDD6")}
            {field("🥉 3rd place", third, setThird, "#D7935C")}
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} disabled={loading}
              className="flex-1 bg-white/8 hover:bg-white/12 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={() => valid && onConfirm({ "1": parsed(first)!, "2": parsed(second)!, "3": parsed(third)! })}
              disabled={loading || !valid}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ending…</> : "Crown Champion"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
