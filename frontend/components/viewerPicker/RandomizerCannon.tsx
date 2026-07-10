"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, X, Play, Trash2, RotateCcw } from "lucide-react";
import { useViewerPickerSound } from "@/lib/viewerPickerSound";
import type { PickerEntry, PickerUser } from "@/lib/api/viewerPicker";

// Deterministic per-user accent (gradient + glow color) and stage placement — no
// physics simulation needed since a hash-derived position is stable across renders
// and lets the cannon's aim be computed analytically instead of queried from the DOM.
const ACCENTS = [
  { grad: "linear-gradient(135deg, oklch(0.7 0.17 200), oklch(0.55 0.14 220))", glow: "rgba(80,210,255,0.45)" },
  { grad: "linear-gradient(135deg, oklch(0.65 0.19 300), oklch(0.5 0.16 320))", glow: "rgba(170,110,255,0.45)" },
  { grad: "linear-gradient(135deg, oklch(0.72 0.17 150), oklch(0.55 0.15 160))", glow: "rgba(90,240,170,0.45)" },
  { grad: "linear-gradient(135deg, oklch(0.72 0.15 340), oklch(0.55 0.16 20))", glow: "rgba(255,120,170,0.4)" },
];

// FNV-1a + a Murmur3-style finalizer, rather than a plain multiply-add hash —
// similar user IDs (e.g. sequential "viewer1".."viewer12" style names) produced
// near-identical outputs under a weak hash, clustering their bubbles on top of
// each other. This mixes enough that a one-character difference in the input
// still lands far apart in the output.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Only ~40 bubbles are ever mounted at once; larger pools rotate through a
// deterministic sliding window so every participant eventually appears without
// ever overcrowding the stage.
const MAX_VISIBLE_BUBBLES = 40;
const ROTATE_WINDOW_MS = 650;
const AMBIENT_COUNT = 40;

type Phase = "idle" | "charging" | "firing" | "popped" | "winner";

interface Aim {
  targetX: number;
  targetY: number;
  pivotX: number;
  pivotY: number;
  angleDeg: number;
  muzzleX: number;
  muzzleY: number;
  size: number;
  leftPct: number;
  topPct: number;
}

function computeAim(rect: { width: number; height: number }, winnerId: string): Aim {
  const h = hashStr(winnerId);
  const leftPct = 3 + (h % 92);
  const topPct = 4 + ((h >>> 4) % 62);
  const size = 62 + (h % 20);
  const targetX = rect.width * (leftPct / 100) + size / 2;
  const targetY = rect.height * (topPct / 100) + size / 2;
  const pivotX = rect.width / 2;
  const pivotY = rect.height - 65;
  const dx = targetX - pivotX;
  const dy = targetY - pivotY;
  let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  angleDeg = Math.max(-85, Math.min(85, angleDeg));
  const rad = (angleDeg * Math.PI) / 180;
  const muzzleX = pivotX + 130 * Math.sin(rad);
  const muzzleY = pivotY - 130 * Math.cos(rad);
  return { targetX, targetY, pivotX, pivotY, angleDeg, muzzleX, muzzleY, size, leftPct, topPct };
}

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [cyclingName, setCyclingName] = useState("");
  const [scanAngle, setScanAngle] = useState(-18);
  const [aim, setAim] = useState<Aim | null>(null);
  const [projectileTravel, setProjectileTravel] = useState(false);
  const [rotateTick, setRotateTick] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);

  const ambient = useMemo(
    () =>
      Array.from({ length: AMBIENT_COUNT }, (_, i) => {
        const h = hashStr("amb" + i);
        const acc = ACCENTS[i % ACCENTS.length];
        return {
          left: h % 100,
          top: (h >>> 3) % 100,
          size: 2 + (h % 3),
          dur: 6 + (h % 8),
          delay: h % 5,
          glow: acc.glow,
        };
      }),
    []
  );

  // Deterministic rotating window so large participant pools never render more
  // than MAX_VISIBLE_BUBBLES DOM nodes at once, while still eventually showing
  // everyone. The winner (once known) is always pinned in.
  useEffect(() => {
    if (entries.length <= MAX_VISIBLE_BUBBLES) return;
    const interval = setInterval(() => setRotateTick((t) => t + 1), ROTATE_WINDOW_MS);
    return () => clearInterval(interval);
  }, [entries.length]);

  const visibleEntries = useMemo(() => {
    if (entries.length <= MAX_VISIBLE_BUBBLES) return entries;
    const start = (rotateTick * 7) % entries.length;
    const window: PickerEntry[] = [];
    for (let i = 0; i < MAX_VISIBLE_BUBBLES; i++) window.push(entries[(start + i) % entries.length]);
    if (winner && !window.some((e) => e.userId === winner.id)) {
      const winnerEntry = entries.find((e) => e.userId === winner.id);
      if (winnerEntry) window[window.length - 1] = winnerEntry;
    }
    return window;
  }, [entries, rotateTick, winner]);

  useEffect(() => {
    if (!winner) {
      setPhase("idle");
      setAim(null);
      setProjectileTravel(false);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPhase("winner");
      setAim(computeAim(stageRef.current?.getBoundingClientRect() ?? { width: 900, height: 700 }, winner.id));
      play("winner");
      onRevealComplete?.();
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const rect = stageRef.current?.getBoundingClientRect() ?? { width: 900, height: 700 };
    const winnerAim = computeAim(rect, winner.id);

    setPhase("charging");
    setAim(winnerAim);
    setProjectileTravel(false);
    play("powerup");

    const cycleInterval = setInterval(() => {
      if (entries.length === 0) return;
      const n = entries[Math.floor(Math.random() * entries.length)];
      setCyclingName(n.user.displayName);
      setScanAngle(-70 + Math.random() * 140);
    }, 70);

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        clearInterval(cycleInterval);
        setPhase("firing");
        setCyclingName(winner.displayName);
        play("fire");

        timers.push(
          setTimeout(() => {
            if (!cancelled) setProjectileTravel(true);
          }, 380)
        );

        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setPhase("popped");

            timers.push(
              setTimeout(() => {
                if (cancelled) return;
                setPhase("winner");
                play("winner");
                onRevealComplete?.();
              }, 550)
            );
          }, 1050)
        );
      }, 1800)
    );

    return () => {
      cancelled = true;
      clearInterval(cycleInterval);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const dimOpacity = phase === "idle" ? 0 : phase === "winner" ? 0.55 : 0.4;
  const barrelTransform =
    phase === "charging" ? `rotate(${scanAngle}deg)` : aim && phase !== "idle" ? `rotate(${aim.angleDeg}deg)` : "rotate(-18deg)";
  const barrelTransition = phase === "charging" ? "transform 0.1s linear" : "transform 0.4s cubic-bezier(0.34,1.4,0.4,1)";
  const muzzleColor = phase === "idle" ? "rgba(120,200,255,0.5)" : phase === "charging" ? "rgba(120,230,255,0.95)" : "rgba(255,255,255,0.95)";
  const displayText = phase === "idle" ? "READY" : cyclingName;

  const projectileVisible = phase === "firing" && !!aim;
  const px = aim ? (projectileTravel ? aim.targetX : aim.muzzleX) : 0;
  const py = aim ? (projectileTravel ? aim.targetY : aim.muzzleY) : 0;

  const scale = compact ? 0.42 : 1;

  return (
    <div
      ref={stageRef}
      className={`relative rounded-2xl overflow-hidden border border-cyan-500/15 ${compact ? "h-56" : "h-[560px]"}`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, oklch(0.2 0.05 280 / 0.6), transparent 60%), linear-gradient(180deg, oklch(0.12 0.025 265), oklch(0.09 0.02 265))",
      }}
    >
      <style>{`
        @keyframes rcFloat1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(14px,-22px); } }
        @keyframes rcFloat2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-18px,-14px); } }
        @keyframes rcFloat3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(10px,18px); } }
        @keyframes rcFloat4 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-12px,20px); } }
        @keyframes rcBubbleGlow { 0%,100% { box-shadow: 0 0 12px 2px var(--bg-glow, rgba(80,220,255,0.35)); } 50% { box-shadow: 0 0 22px 6px var(--bg-glow, rgba(80,220,255,0.55)); } }
        @keyframes rcAmbientDrift { 0%,100% { transform: translate(0,0); opacity: 0.5; } 50% { transform: translate(30px,-40px); opacity: 1; } }
        @keyframes rcTargetPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5), 0 0 24px 6px var(--bg-glow); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0), 0 0 34px 10px var(--bg-glow); } }
        @keyframes rcBurstFly { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--bx), var(--by)) scale(0.3); opacity: 0; } }
        @keyframes rcBlastFlash { 0% { transform: scale(0.2); opacity: 0.9; } 100% { transform: scale(3.2); opacity: 0; } }
        @keyframes rcWinnerPop { 0% { transform: scale(0.6) translateY(20px); opacity: 0; } 60% { transform: scale(1.05) translateY(0); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes rcGlowPulse { 0%,100% { text-shadow: 0 0 18px rgba(120,230,255,0.7), 0 0 40px rgba(170,110,255,0.4); } 50% { text-shadow: 0 0 30px rgba(120,230,255,1), 0 0 60px rgba(170,110,255,0.7); } }
        @keyframes rcConfettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(90vh) rotate(540deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .rc-anim { animation: none !important; }
        }
      `}</style>

      {/* Ambient drifting particles */}
      {ambient.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none rc-anim"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.glow,
            boxShadow: `0 0 8px 2px ${p.glow}`,
            animation: `rcAmbientDrift ${p.dur}s ease-in-out ${p.delay}s infinite`,
            zIndex: 1,
          }}
        />
      ))}

      {/* Dim overlay during the sequence, deepest once revealed */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-500"
        style={{ opacity: dimOpacity, zIndex: 3 }}
      />

      {/* Mute toggle */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-white/8 hover:bg-white/15 text-white/70 transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bubbles */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {visibleEntries.map((e) => {
          const h = hashStr(e.userId);
          const left = 3 + (h % 92);
          const top = 4 + ((h >>> 4) % 62);
          const dur = 5 + (h % 6);
          const delay = (h % 40) / 10;
          const variant = (h % 4) + 1;
          const size = compact ? 34 + (h % 12) : 62 + (h % 20);
          const acc = ACCENTS[h % ACCENTS.length];
          const isTarget = !!winner && e.userId === winner.id;
          const revealed = phase === "firing" || phase === "popped" || phase === "winner";
          const isPopped = isTarget && (phase === "popped" || phase === "winner");

          let opacity = 0.95;
          let anim = `rcFloat${variant} ${dur}s ease-in-out ${delay}s infinite, rcBubbleGlow ${2 + (h % 3)}s ease-in-out infinite`;
          let border = "1px solid rgba(255,255,255,0.18)";
          if (isPopped) {
            opacity = 0;
          } else if (isTarget && revealed) {
            opacity = 1;
            anim = `rcTargetPulse 0.5s ease-in-out infinite`;
            border = "2px solid rgba(255,255,255,0.8)";
          } else if (revealed) {
            opacity = 0.06;
          }

          return (
            <div
              key={e.id}
              className="absolute flex items-center justify-center text-center font-bold text-white rc-anim"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                borderRadius: "50%",
                padding: 4,
                fontSize: compact ? 8 : 11,
                lineHeight: 1.15,
                wordBreak: "break-word",
                background: e.user.avatarUrl ? `url(${e.user.avatarUrl}) center/cover` : acc.grad,
                backgroundColor: "rgba(20,22,36,0.55)",
                backdropFilter: "blur(6px)",
                border,
                ["--bg-glow" as any]: acc.glow,
                animation: anim,
                opacity,
                transition: "opacity 0.6s ease, border 0.3s ease",
                zIndex: isTarget && revealed ? 3 : 2,
                textShadow: e.user.avatarUrl ? "0 1px 3px rgba(0,0,0,0.9)" : "none",
              }}
            >
              {e.user.displayName}
            </div>
          );
        })}
      </div>

      {/* Cannon assembly */}
      <div
        className="absolute left-1/2 bottom-0 pointer-events-none"
        style={{ width: 290, height: 300, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "bottom center", zIndex: 4 }}
      >
        {/* ground shadow */}
        <div
          className="absolute rounded-full"
          style={{ left: "50%", bottom: 8, width: 120, height: 13, marginLeft: -60, background: "radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)", filter: "blur(2px)" }}
        />
        {/* pedestal */}
        <div
          className="absolute"
          style={{
            left: "50%", bottom: 15, width: 122, height: 47, marginLeft: -61,
            borderRadius: "8px 8px 13px 13px",
            background: "linear-gradient(180deg, oklch(0.4 0.015 250), oklch(0.22 0.015 250) 55%, oklch(0.14 0.01 250))",
            border: "1px solid rgba(140,200,255,0.25)",
            boxShadow: "0 5px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="absolute" style={{ top: 5, left: 8, right: 8, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
          <div className="absolute rounded-full" style={{ bottom: 6, left: 13, width: 5, height: 5, background: "oklch(0.55 0.02 250)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.6)" }} />
          <div className="absolute rounded-full" style={{ bottom: 6, right: 13, width: 5, height: 5, background: "oklch(0.55 0.02 250)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.6)" }} />
        </div>
        {/* turret housing */}
        <div
          className="absolute rounded-full"
          style={{
            left: "50%", bottom: 42, width: 78, height: 78, marginLeft: -39,
            background: "radial-gradient(circle at 35% 30%, oklch(0.5 0.02 250), oklch(0.24 0.015 250) 55%, oklch(0.15 0.01 250) 85%)",
            border: "1px solid rgba(140,200,255,0.3)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.5), inset 0 0 14px rgba(0,0,0,0.5), 0 0 16px rgba(120,200,255,0.15)",
          }}
        >
          <div className="absolute rounded-full" style={{ inset: 6, border: "1px solid rgba(255,255,255,0.06)" }} />
        </div>
        {/* barrel assembly — rotates to aim */}
        <div
          className="absolute"
          style={{
            left: "50%", bottom: 65, width: 31, height: 124, marginLeft: -15.5,
            transformOrigin: "bottom center",
            transition: barrelTransition,
            transform: barrelTransform,
            zIndex: 2,
          }}
        >
          <div className="absolute" style={{ left: 0, bottom: 0, width: 31, height: 114, borderRadius: "5px 5px 3px 3px", background: "linear-gradient(90deg, oklch(0.16 0.01 250) 0%, oklch(0.34 0.015 250) 22%, oklch(0.48 0.02 250) 38%, oklch(0.3 0.015 250) 55%, oklch(0.2 0.01 250) 100%)", boxShadow: "0 3px 11px rgba(0,0,0,0.55)" }} />
          <div className="absolute" style={{ left: 7, bottom: 3, width: 4, height: 107, borderRadius: 2, background: "linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02))", opacity: 0.6 }} />
          <div className="absolute" style={{ left: -2, bottom: 31, width: 35, height: 6, borderRadius: 3, background: "linear-gradient(90deg, oklch(0.14 0.01 250), oklch(0.32 0.015 250) 45%, oklch(0.14 0.01 250))", border: "1px solid rgba(0,0,0,0.4)" }} />
          <div className="absolute" style={{ left: -2, bottom: 69, width: 35, height: 6, borderRadius: 3, background: "linear-gradient(90deg, oklch(0.14 0.01 250), oklch(0.32 0.015 250) 45%, oklch(0.14 0.01 250))", border: "1px solid rgba(0,0,0,0.4)" }} />
          <div className="absolute" style={{ left: "50%", top: -5, width: 39, height: 16, marginLeft: -19.5, borderRadius: 7, background: "linear-gradient(90deg, oklch(0.16 0.01 250), oklch(0.4 0.02 250) 50%, oklch(0.16 0.01 250))", border: "1px solid rgba(140,200,255,0.25)", boxShadow: "0 0 8px rgba(0,0,0,0.4)" }} />
          <div className="absolute rounded-full" style={{ left: "50%", top: -6, width: 21, height: 21, marginLeft: -10.5, background: "oklch(0.08 0.005 250)", boxShadow: "inset 0 0 8px rgba(0,0,0,0.8)" }}>
            <div className="absolute rounded-full" style={{ inset: 3, background: `radial-gradient(circle, ${muzzleColor}, transparent 72%)`, filter: "blur(0.5px)" }} />
          </div>
        </div>
        {/* HUD readout */}
        <div
          className="absolute flex items-center justify-center overflow-hidden"
          style={{
            left: "50%", bottom: 220, width: 110, height: 20, marginLeft: -55, borderRadius: 6,
            background: "linear-gradient(180deg, rgba(10,12,20,0.92), rgba(20,22,34,0.92))",
            border: "1px solid rgba(120,220,255,0.45)", boxShadow: "0 0 10px rgba(120,220,255,0.35)", zIndex: 5,
          }}
        >
          <div
            className="font-gaming whitespace-nowrap rc-anim"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "oklch(0.85 0.15 190)", animation: phase === "idle" ? "none" : "rcGlowPulse 0.4s infinite" }}
          >
            {displayText}
          </div>
        </div>
      </div>

      {/* Muzzle blast flash */}
      {phase === "firing" && aim && (
        <div
          className="absolute rounded-full rc-anim pointer-events-none"
          style={{ left: aim.muzzleX, top: aim.muzzleY, transform: "translate(-50%,-50%)", width: 70, height: 70, background: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(120,230,255,0.5) 40%, transparent 70%)", animation: "rcBlastFlash 0.5s ease-out forwards", zIndex: 8 }}
        />
      )}

      {/* Projectile travelling to the target */}
      {projectileVisible && aim && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: px, top: py, transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%",
            background: "radial-gradient(circle, #fff, rgba(120,230,255,0.9) 50%, transparent 80%)",
            boxShadow: "0 0 24px 8px rgba(120,230,255,0.7)",
            transition: "left 0.6s cubic-bezier(0.3,0.6,0.2,1), top 0.6s cubic-bezier(0.3,0.6,0.2,1)",
            zIndex: 9,
          }}
        />
      )}

      {/* Pop burst */}
      {phase === "popped" && aim && (
        <>
          {Array.from({ length: 26 }).map((_, i) => {
            const ang = (i / 26) * Math.PI * 2;
            const dist = 60 + ((i * 37) % 60);
            const color = ACCENTS[i % ACCENTS.length].glow;
            return (
              <div
                key={i}
                className="absolute rounded-full pointer-events-none rc-anim"
                style={{
                  left: aim.targetX, top: aim.targetY, width: 8, height: 8, background: color,
                  boxShadow: `0 0 10px 3px ${color}`,
                  ["--bx" as any]: `${Math.cos(ang) * dist}px`,
                  ["--by" as any]: `${Math.sin(ang) * dist}px`,
                  animation: "rcBurstFly 0.6s ease-out forwards",
                  zIndex: 9,
                }}
              />
            );
          })}
        </>
      )}

      {/* Winner card */}
      {phase === "winner" && winner && (
        <div className="absolute inset-0 flex items-center justify-center px-4" style={{ zIndex: 10 }}>
          {Array.from({ length: 40 }).map((_, i) => {
            const color = ACCENTS[i % ACCENTS.length].glow;
            return (
              <div
                key={i}
                className="absolute rc-anim"
                style={{
                  left: `${(i * 37) % 100}%`, top: -10, width: 8, height: 14, background: color,
                  transform: `rotate(${(i * 53) % 360}deg)`, borderRadius: 2,
                  animation: `rcConfettiFall ${1.6 + (i % 6) * 0.2}s linear ${(i % 8) * 0.08}s forwards`,
                }}
              />
            );
          })}
          <motion.div
            initial={{ scale: 0.6, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.9, 0.3, 1.2] }}
            className="relative text-center rounded-3xl px-9 py-8"
            style={{
              background: "rgba(24,26,40,0.75)", backdropFilter: "blur(24px)", border: "1px solid rgba(150,220,255,0.35)",
              boxShadow: "0 0 70px rgba(120,200,255,0.35), 0 0 120px rgba(170,110,255,0.25)",
            }}
          >
            <div className="text-3xl mb-2">🏆</div>
            {winner.avatarUrl ? (
              <img src={winner.avatarUrl} alt="" className="w-[88px] h-[88px] rounded-full object-cover mx-auto mb-4" style={{ boxShadow: "0 0 40px rgba(120,220,255,0.5)" }} />
            ) : (
              <div
                className="w-[88px] h-[88px] rounded-full mx-auto mb-4 flex items-center justify-center font-gaming text-3xl font-extrabold text-white"
                style={{ background: ACCENTS[hashStr(winner.id) % ACCENTS.length].grad, boxShadow: "0 0 40px rgba(120,220,255,0.5)" }}
              >
                {winner.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="font-gaming text-2xl font-extrabold tracking-wide text-white mb-1.5 rc-anim" style={{ animation: "rcGlowPulse 1.4s infinite" }}>
              {winner.displayName}
            </div>
            <p className="font-gaming text-sm font-bold tracking-[2px] mb-6" style={{ color: "oklch(0.8 0.16 150)" }}>
              🎉 WINNER!
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {onPickAnother && (
                <button
                  onClick={onPickAnother}
                  className="flex items-center gap-1.5 font-gaming font-bold text-xs px-4 py-2.5 rounded-xl text-white transition-transform hover:scale-105"
                  style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 200), oklch(0.62 0.19 300))", boxShadow: "0 0 20px rgba(120,200,255,0.4)" }}
                >
                  <Play className="w-3.5 h-3.5" /> PICK ANOTHER
                </button>
              )}
              {onRemoveAndContinue && (
                <button
                  onClick={() => onRemoveAndContinue(winner.id)}
                  className="flex items-center gap-1.5 font-gaming font-bold text-xs px-4 py-2.5 rounded-xl text-white/85 bg-white/6 hover:bg-white/12 border border-white/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> REMOVE & CONTINUE
                </button>
              )}
              {onReset && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 font-gaming font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
                  style={{ background: "rgba(255,120,120,0.08)", border: "1px solid rgba(255,120,120,0.3)", color: "oklch(0.75 0.15 25)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> RESET
                </button>
              )}
            </div>
            {onReset && (
              <button onClick={onReset} title="Close" className="absolute -top-3 -right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* Idle label */}
      {phase === "idle" && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-cyan-300/50 text-[11px] uppercase tracking-widest font-semibold" style={{ zIndex: 6 }}>
          {entries.length} entered
        </p>
      )}
    </div>
  );
}
