"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, X } from "lucide-react";
import Confetti from "@/components/highRoller/Confetti";
import Fireworks from "@/components/weeklyRaffle/Fireworks";
import CannonParticles from "./CannonParticles";
import CannonGraphic, { CannonStage } from "./CannonGraphic";
import BubbleField, { BubbleFieldHandle } from "./BubbleField";
import { MuzzleFlash, SmokeBurst } from "./CannonEffects";
import WinnerCard from "./WinnerCard";
import { useViewerPickerSound } from "@/lib/viewerPickerSound";
import type { PickerEntry, PickerUser } from "@/lib/api/viewerPicker";

const MAX_IDLE_ORBS = 48;

// Phase timings (ms) — tuned so the full bubbles→settled sequence lands at ~6.9s,
// within the "5–7 seconds total" target while keeping every individual phase in
// the spec's own stated range.
const T_BUBBLES = 700;
const T_ENTER = 400;
const T_SETTLE = 300;
const T_CHARGE = 900;
const T_SEARCH = 1700;
const T_LOCKON = 700;
const T_FIRE_FLASH = 150;
const T_FIRE_TAIL = 250;
const T_REVEAL = 900;
const T_CELEBRATE = 900;
const SEARCH_VISITS = 3;

type Phase =
  | "idle"
  | "bubbles"
  | "entrance"
  | "charging"
  | "searching"
  | "lockon"
  | "firing"
  | "reveal"
  | "celebration"
  | "settled";

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

// Angle (degrees, 0 = straight up) from the cannon's fixed pivot to a fractional
// (0–1) point within the shared scene box — the same math used to both aim the
// barrel and lay the laser sight along it.
function angleTo(sceneEl: HTMLElement | null, xFrac: number, yFrac: number): number {
  if (!sceneEl) return 0;
  const rect = sceneEl.getBoundingClientRect();
  const pivotX = rect.width * 0.5;
  const pivotY = rect.height * 0.9;
  const dx = xFrac * rect.width - pivotX;
  const dy = yFrac * rect.height - pivotY;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Math.max(-80, Math.min(80, deg));
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
  const [cannonStage, setCannonStage] = useState<CannonStage>("hidden");
  const [angle, setAngle] = useState(0);
  const [laserColor, setLaserColor] = useState<"cyan" | "red" | "none">("none");
  // Whichever bubble is currently under the laser sweep — any bubble, so the search
  // genuinely visits several candidates before the winner is revealed.
  const [sweepTargetId, setSweepTargetId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [dimOthers, setDimOthers] = useState(false);
  const [burstWinner, setBurstWinner] = useState(false);
  const [muzzleFlash, setMuzzleFlash] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [shakeTick, setShakeTick] = useState(0);

  const sceneRef = useRef<HTMLDivElement>(null);
  const bubbleFieldRef = useRef<BubbleFieldHandle>(null);

  const visibleEntries = entries.slice(-MAX_IDLE_ORBS);
  const overflowCount = Math.max(0, entries.length - MAX_IDLE_ORBS);

  useEffect(() => {
    if (!winner) {
      setPhase("idle");
      setCannonStage("hidden");
      setAngle(0);
      setLaserColor("none");
      setSweepTargetId(null);
      setLocked(false);
      setDimOthers(false);
      setBurstWinner(false);
      setMuzzleFlash(false);
      setShowSmoke(false);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPhase("settled");
      play("winner");
      onRevealComplete?.();
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let chosenTargets: string[] | null = null;

    const at = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    };

    let t = 0;
    at((t += 0), () => setPhase("bubbles"));

    at((t += T_BUBBLES), () => {
      setPhase("entrance");
      setCannonStage("entering");
      play("entrance");
    });
    at((t += T_ENTER), () => {
      setCannonStage("settling");
      setShakeTick((s) => s + 1);
    });

    at((t += T_SETTLE), () => {
      setPhase("charging");
      setCannonStage("charging");
      play("powerup");
    });

    at((t += T_CHARGE), () => {
      setPhase("searching");
      setCannonStage("searching");
      setLaserColor("cyan");
    });

    const perVisit = Math.floor(T_SEARCH / SEARCH_VISITS);
    for (let i = 0; i < SEARCH_VISITS; i++) {
      at((t += i === 0 ? 0 : perVisit), () => {
        if (!chosenTargets) {
          const pool = bubbleFieldRef.current?.getVisibleIds(winner.id) ?? [];
          for (let k = pool.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [pool[k], pool[j]] = [pool[j], pool[k]];
          }
          chosenTargets = pool.slice(0, SEARCH_VISITS);
        }
        const id = chosenTargets[i] ?? chosenTargets[0];
        play("blip");
        if (!id) return;
        setSweepTargetId(id);
        const pos = bubbleFieldRef.current?.getPosition(id);
        if (pos) {
          const target = angleTo(sceneRef.current, pos.xFrac, pos.yFrac);
          const overshoot = target + (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 8);
          setAngle(overshoot);
          setTimeout(() => { if (!cancelled) setAngle(target); }, 170);
        }
      });
    }

    at((t += perVisit), () => {
      setPhase("lockon");
      setCannonStage("lockon");
      setLaserColor("red");
      setSweepTargetId(null);
      setLocked(true);
      setDimOthers(true);
      play("lockon");
      const pos = bubbleFieldRef.current?.getPosition(winner.id);
      if (pos) {
        const target = angleTo(sceneRef.current, pos.xFrac, pos.yFrac);
        setAngle(target + 10);
        setTimeout(() => { if (!cancelled) setAngle(target); }, 220);
      }
    });

    at((t += T_LOCKON), () => {
      setPhase("firing");
      setCannonStage("firing");
      setLaserColor("none");
      setMuzzleFlash(true);
      setShowSmoke(true);
      setShakeTick((s) => s + 1);
      play("fire");
    });
    at((t += T_FIRE_FLASH), () => setMuzzleFlash(false));

    at((t += T_FIRE_TAIL), () => {
      setPhase("reveal");
      setCannonStage("done");
      setBurstWinner(true);
      play("winner");
    });

    at((t += T_REVEAL), () => {
      setPhase("celebration");
      setShowSmoke(false);
    });

    at((t += T_CELEBRATE), () => {
      setPhase("settled");
      onRevealComplete?.();
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const overlayActive = phase !== "idle" && winner;
  const bubblesMounted = overlayActive && phase !== "celebration" && phase !== "settled";
  const cannonVisible = overlayActive && phase !== "reveal" && phase !== "celebration" && phase !== "settled";
  const cardVisible = overlayActive && (phase === "reveal" || phase === "celebration" || phase === "settled");

  return (
    <div className="relative">
      {/* Idle scene — always visible inline preview */}
      <div className={`relative rounded-2xl border border-cyan-500/20 bg-[#0a0e17] overflow-hidden ${compact ? "h-56" : "h-[420px]"}`}>
        <CannonParticles />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <CannonGraphic stage="idle" angle={0} laserColor="none" size={110} />
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
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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

      {/* Full-screen cinematic sequence */}
      <AnimatePresence>
        {overlayActive && (
          <motion.div
            ref={sceneRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#05070d]/95 backdrop-blur-md overflow-hidden"
          >
            <motion.div
              key={shakeTick}
              animate={{ x: [0, -6, 6, -4, 4, -2, 2, 0], y: [0, 3, -3, 2, -2, 0] }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0"
            >
              <div className="fixed top-4 right-4 z-[70] flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                {phase === "settled" && onReset && (
                  <button
                    onClick={onReset}
                    title="Close"
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {bubblesMounted && (
                <BubbleField
                  ref={bubbleFieldRef}
                  entries={entries}
                  winnerId={winner!.id}
                  cyclingActive={phase === "bubbles" || phase === "entrance" || phase === "charging" || phase === "searching"}
                  dimOthers={dimOthers}
                  sweepTargetId={sweepTargetId}
                  locked={locked}
                  burstWinner={burstWinner}
                />
              )}

              {cannonVisible && (
                <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "6%" }}>
                  <CannonGraphic stage={cannonStage} angle={angle} laserColor={laserColor} size={150} />
                </div>
              )}

              {muzzleFlash && <MuzzleFlash />}
              {showSmoke && <SmokeBurst />}

              {cardVisible && (
                <>
                  <Confetti durationMs={4200} colors={["#22d3ee", "#a855f7", "#38bdf8", "#ffffff", "#fbbf24"]} />
                  <Fireworks durationMs={4200} colors={["#22d3ee", "#a855f7", "#38bdf8", "#fbbf24"]} />
                  <WinnerCard
                    winner={winner!}
                    showButtons={phase === "settled"}
                    onPickAnother={onPickAnother}
                    onRemoveAndContinue={onRemoveAndContinue}
                    onReset={onReset}
                  />
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
