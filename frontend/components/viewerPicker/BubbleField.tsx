"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Avatar from "./Avatar";
import type { PickerEntry } from "@/lib/api/viewerPicker";

const CAP = 24;
const CYCLE_INTERVAL_MS = 550;
const EASE = [0.16, 1, 0.3, 1] as const;

interface Physics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bobPhase: number;
  bobSpeed: number;
  bobAmp: number;
}

export interface BubbleFieldHandle {
  // Fractional (0–1) position within the field's own bounding box — the caller
  // converts to pixels/angle using that same box, so the two stay in sync.
  getPosition: (userId: string) => { xFrac: number; yFrac: number } | null;
  getVisibleIds: (excludeUserId?: string | null) => string[];
}

interface BubbleFieldProps {
  entries: PickerEntry[];
  winnerId: string | null;
  cyclingActive: boolean;
  dimOthers: boolean;
  // The bubble currently under the laser sweep — any bubble, not necessarily the
  // winner, so scanning genuinely visits several candidates before lock-on.
  sweepTargetId: string | null;
  // Dramatic red/pulsing styling for the winner specifically, from lock-on onward.
  locked: boolean;
  burstWinner: boolean;
}

// Lightweight floating-bubble field: drift physics + soft mutual repulsion run on
// a ref (not React state) and are written straight to each bubble's DOM transform
// every frame, so ~24 bubbles animate at 60fps without triggering React re-renders.
// Membership (who's currently shown) IS React state, since that drives mount/unmount
// of avatar/name content and the cycle-in/cycle-out fade.
const BubbleField = forwardRef<BubbleFieldHandle, BubbleFieldProps>(function BubbleField(
  { entries, winnerId, cyclingActive, dimOthers, sweepTargetId, locked, burstWinner },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<Map<string, Physics>>(new Map());
  const elRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>();
  const sizeRef = useRef({ w: 800, h: 420 });

  const [visible, setVisible] = useState<PickerEntry[]>([]);

  // Seed the initial visible set once — the winner (if known) is always included
  // and pinned so it's guaranteed to exist for the cannon to aim at later.
  useEffect(() => {
    setVisible((prev) => {
      if (prev.length > 0) return prev;
      const winnerEntry = winnerId ? entries.find((e) => e.userId === winnerId) : undefined;
      const rest = entries.filter((e) => e.userId !== winnerId);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const picked = rest.slice(0, winnerEntry ? CAP - 1 : CAP);
      return winnerEntry ? [winnerEntry, ...picked] : picked;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuously swap one random non-winner bubble for an unseen participant so
  // large participant pools all get represented without ever overcrowding the screen.
  useEffect(() => {
    if (!cyclingActive || entries.length <= CAP) return;
    const interval = setInterval(() => {
      setVisible((prev) => {
        const visibleIds = new Set(prev.map((e) => e.userId));
        const candidates = entries.filter((e) => !visibleIds.has(e.userId));
        const removable = prev.filter((e) => e.userId !== winnerId);
        if (candidates.length === 0 || removable.length === 0) return prev;
        const toRemove = removable[Math.floor(Math.random() * removable.length)];
        const toAdd = candidates[Math.floor(Math.random() * candidates.length)];
        return prev.map((e) => (e.id === toRemove.id ? toAdd : e));
      });
    }, CYCLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [cyclingActive, entries, winnerId]);

  // Keep the physics map's membership in sync with the visible list — new bubbles
  // spawn at a random point with a small random drift velocity.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    const map = physicsRef.current;
    const currentIds = new Set(visible.map((e) => e.userId));
    for (const id of Array.from(map.keys())) {
      if (!currentIds.has(id)) map.delete(id);
    }
    for (const e of visible) {
      if (!map.has(e.userId)) {
        map.set(e.userId, {
          x: 40 + Math.random() * Math.max(1, w - 80),
          y: 40 + Math.random() * Math.max(1, h - 80),
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          bobPhase: Math.random() * Math.PI * 2,
          bobSpeed: 0.6 + Math.random() * 0.5,
          bobAmp: 4 + Math.random() * 4,
        });
      }
    }
  }, [visible]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w, h } = sizeRef.current;
      const map = physicsRef.current;
      const list = Array.from(map.entries());

      // Soft pairwise repulsion — cheap at ~24 bubbles (O(n^2) ≈ 300 checks/frame).
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [, a] = list[i];
          const [, b] = list[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = 68;
          if (dist < minDist) {
            const push = ((minDist - dist) / minDist) * 40;
            const nx = dx / dist;
            const ny = dy / dist;
            a.vx -= nx * push * dt;
            a.vy -= ny * push * dt;
            b.vx += nx * push * dt;
            b.vy += ny * push * dt;
          }
        }
      }

      for (const [id, p] of list) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.bobPhase += p.bobSpeed * dt;

        const pad = 40;
        if (p.x < pad) { p.x = pad; p.vx = Math.abs(p.vx); }
        if (p.x > w - pad) { p.x = w - pad; p.vx = -Math.abs(p.vx); }
        if (p.y < pad) { p.y = pad; p.vy = Math.abs(p.vy); }
        if (p.y > h - pad) { p.y = h - pad; p.vy = -Math.abs(p.vy); }

        p.vx *= 0.995;
        p.vy *= 0.995;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 4) {
          p.vx += (Math.random() - 0.5) * 3;
          p.vy += (Math.random() - 0.5) * 3;
        }

        const bobY = Math.sin(p.bobPhase) * p.bobAmp;
        const node = elRefs.current.get(id);
        if (node) node.style.transform = `translate3d(${p.x}px, ${p.y + bobY}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useImperativeHandle(ref, () => ({
    getPosition: (userId: string) => {
      const p = physicsRef.current.get(userId);
      const { w, h } = sizeRef.current;
      if (!p || w === 0 || h === 0) return null;
      return { xFrac: (p.x + 24) / w, yFrac: (p.y + 20) / h };
    },
    getVisibleIds: (excludeUserId?: string | null) =>
      visible.map((e) => e.userId).filter((id) => id !== excludeUserId),
  }), [visible]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {visible.map((e) => {
          const isWinner = e.userId === winnerId;
          const dim = dimOthers && !isWinner;
          const isLocked = isWinner && locked;
          const targeted = !isLocked && e.userId === sweepTargetId;
          const burst = isWinner && burstWinner;
          return (
            <motion.div
              key={e.id}
              ref={(node) => {
                if (node) elRefs.current.set(e.userId, node);
                else elRefs.current.delete(e.userId);
              }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={
                burst
                  ? { opacity: 0, scale: 2.4 }
                  : { opacity: dim ? 0.12 : 1, scale: isLocked ? 1.35 : targeted ? 1.15 : 1 }
              }
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ duration: burst ? 0.5 : 0.35, ease: EASE }}
              className="absolute top-0 left-0 flex flex-col items-center gap-1 pointer-events-none"
              style={{ willChange: "transform" }}
            >
              <div
                className={`rounded-full p-0.5 transition-shadow ${
                  isLocked
                    ? "bg-red-500/30 shadow-[0_0_30px_10px_rgba(239,68,68,0.55)] animate-pulse"
                    : targeted
                    ? "bg-cyan-400/25 shadow-[0_0_20px_6px_rgba(34,211,238,0.5)]"
                    : "bg-white/5 shadow-[0_0_10px_2px_rgba(34,211,238,0.15)]"
                }`}
              >
                <div className="rounded-full backdrop-blur-sm bg-white/5 border border-white/10">
                  <Avatar user={e.user} size={isLocked ? 60 : targeted ? 52 : 44} />
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap ${
                  isLocked ? "bg-red-500/20 text-red-200" : "bg-black/30 text-cyan-100/80"
                }`}
              >
                {e.user.displayName}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default BubbleField;
