"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface RevealWinner {
  id: string;
  userId: string;
  position: number;
  prizeDescription?: string;
  ticketNumber?: number;
  displayName?: string;
  avatarUrl?: string | null;
}

interface RaffleDrawRevealProps {
  raffleId: string;
  onClose: (success: boolean) => void;
}

type Phase =
  | "intro"
  | "shuffle"
  | "spotlight"
  | "choose"
  | "glow"
  | "lift"
  | "flip"
  | "reveal"
  | "celebrate"
  | "error";

const CARD_COUNT = 12;

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Hooks for future audio — drop .mp3 files in /public/sounds and set these paths to enable.
const SOUND_SRC: Record<"shuffle" | "spark" | "cheer", string | null> = {
  shuffle: null,
  spark: null,
  cheer: null,
};

function playSound(key: keyof typeof SOUND_SRC) {
  const src = SOUND_SRC[key];
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.volume = 0.6;
    void audio.play();
  } catch {
    /* ignore playback errors (autoplay policy, missing file, etc.) */
  }
}

// ─── Shuffle jitter — each card gets its own randomized flight path that settles back to
// the neat grid, so we don't need to literally reorder DOM nodes to sell the shuffle.
function useShuffleKeyframes(seed: number) {
  return useMemo(() => {
    return Array.from({ length: CARD_COUNT }, () => {
      const steps = 5;
      const x = [0];
      const y = [0];
      const rotateY = [0];
      const rotateX = [0];
      const scale = [1];
      for (let i = 0; i < steps; i++) {
        x.push(randRange(-90, 90));
        y.push(randRange(-60, 60));
        rotateY.push(randRange(-35, 35));
        rotateX.push(randRange(-15, 15));
        scale.push(randRange(0.92, 1.05));
      }
      x.push(0);
      y.push(0);
      rotateY.push(0);
      rotateX.push(0);
      scale.push(1);
      return { x, y, rotateY, rotateX, scale };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [seed]);
}

function Sparks({ active }: { active: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        angle: (i / 10) * Math.PI * 2 + randRange(-0.3, 0.3),
        distance: randRange(50, 110),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  if (!active) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-gold-400 pointer-events-none"
          style={{ boxShadow: "0 0 6px 2px rgba(250,204,21,0.8)" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ─── Canvas confetti — self-contained, no external dependency ────────────────────
function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ["#facc15", "#fbbf24", "#f59e0b", "#fde68a", "#ffffff"];
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  interface Particle {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; rotation: number; rotationSpeed: number; life: number;
  }

  const particles: Particle[] = [];
  for (let side = 0; side < 2; side++) {
    const originX = side === 0 ? 0 : w;
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: originX,
        y: h * randRange(0.3, 0.7),
        vx: (side === 0 ? 1 : -1) * randRange(4, 11),
        vy: randRange(-9, -3),
        size: randRange(4, 8),
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: randRange(0, Math.PI * 2),
        rotationSpeed: randRange(-0.3, 0.3),
        life: 1,
      });
    }
  }

  let raf: number;
  const gravity = 0.25;
  const start = performance.now();

  function frame(now: number) {
    const elapsed = now - start;
    ctx!.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.vx *= 0.99;
      if (elapsed > 3500) p.life -= 0.02;

      ctx!.save();
      ctx!.globalAlpha = Math.max(p.life, 0);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx!.restore();
    }

    if (elapsed < 5000) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx!.clearRect(0, 0, w, h);
    }
  }

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function Card({
  index,
  phase,
  isActive,
  isDimmed,
  isFlipped,
  isSelectable,
  winner,
  keyframes,
  onSelect,
}: {
  index: number;
  phase: Phase;
  isActive: boolean;
  isDimmed: boolean;
  isFlipped: boolean;
  isSelectable: boolean;
  winner: RevealWinner | null;
  keyframes: { x: number[]; y: number[]; rotateY: number[]; rotateX: number[]; scale: number[] };
  onSelect: (index: number) => void;
}) {
  const shuffling = phase === "shuffle";

  return (
    <motion.div
      className={`relative aspect-[3/4] ${isSelectable ? "cursor-pointer" : ""}`}
      style={{ perspective: 1000 }}
      onClick={isSelectable ? () => onSelect(index) : undefined}
      whileHover={isSelectable ? { scale: 1.06, y: -6 } : undefined}
      animate={{
        opacity: isDimmed ? 0.35 : 1,
        filter: isDimmed ? "blur(3px) brightness(0.5)" : "blur(0px) brightness(1)",
        scale: isActive && (phase === "lift" || phase === "flip" || phase === "reveal") ? 1.12 : isDimmed ? 0.94 : 1,
        y: isActive && (phase === "lift" || phase === "flip" || phase === "reveal") ? -14 : 0,
        zIndex: isActive ? 20 : 1,
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          shuffling
            ? { x: keyframes.x, y: keyframes.y, rotateY: keyframes.rotateY, rotateX: keyframes.rotateX, scale: keyframes.scale }
            : isFlipped
            ? { rotateY: 180 }
            : { x: 0, y: 0, rotateY: 0, rotateX: 0, scale: 1 }
        }
        transition={
          shuffling
            ? { duration: 4, ease: "easeInOut", times: [0, 0.16, 0.34, 0.52, 0.7, 0.86, 1] }
            : { duration: 1, ease: [0.45, 0, 0.2, 1] }
        }
      >
        {/* Front face */}
        <div
          className={`absolute inset-0 rounded-2xl border-2 bg-gradient-to-br from-neutral-900 to-black flex flex-col items-center justify-center gap-2 transition-shadow duration-300 ${
            isSelectable
              ? "border-gold-400 shadow-[0_0_24px_rgba(250,204,21,0.3)] hover:shadow-[0_0_36px_rgba(250,204,21,0.55)]"
              : "border-gold-500/50 shadow-[0_0_20px_rgba(250,204,21,0.08)]"
          }`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <motion.div
            animate={
              isActive && phase === "glow"
                ? { boxShadow: ["0 0 0px rgba(250,204,21,0)", "0 0 40px 10px rgba(250,204,21,0.55)", "0 0 0px rgba(250,204,21,0)"] }
                : {}
            }
            transition={{ duration: 1.5, repeat: isActive && phase === "glow" ? Infinity : 0 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
          />
          <span className="text-4xl sm:text-5xl text-gold-400/80 font-bold">?</span>
          <span className="text-[10px] sm:text-xs text-white/30 font-semibold uppercase tracking-widest">
            {isSelectable ? "Tap to Reveal" : "Potential Winner"}
          </span>
          {isActive && (phase === "lift" || phase === "flip") && <Sparks active={isActive} />}
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-gold-400 bg-gradient-to-br from-neutral-900 via-black to-neutral-900 flex flex-col items-center justify-center gap-2 px-3 text-center shadow-[0_0_50px_rgba(250,204,21,0.35)]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-gold-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
          <p className="text-white font-bold text-sm sm:text-base leading-tight">{winner?.displayName ?? "—"}</p>
          {winner?.ticketNumber !== undefined && (
            <p className="text-white/40 text-[10px] sm:text-xs">Ticket #{winner.ticketNumber}</p>
          )}
          {winner?.prizeDescription && (
            <p className="text-gold-400 text-xs sm:text-sm font-semibold">{winner.prizeDescription}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main reveal overlay ─────────────────────────────────────────────────────────
export default function RaffleDrawReveal({ raffleId, onClose }: RaffleDrawRevealProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [revealedCards, setRevealedCards] = useState<Record<number, RevealWinner>>({});
  const [currentWinner, setCurrentWinner] = useState<RevealWinner | null>(null);
  const [allWinners, setAllWinners] = useState<RevealWinner[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const chooseResolveRef = useRef<((index: number) => void) | null>(null);

  const keyframeSets = useShuffleKeyframes(shuffleSeed);

  useEffect(() => setMounted(true), []);

  const handleCardSelect = (index: number) => {
    const resolve = chooseResolveRef.current;
    if (!resolve) return;
    chooseResolveRef.current = null;
    resolve(index);
  };

  useEffect(() => {
    let cancelled = false;

    const waitForCardChoice = (): Promise<number> =>
      new Promise((resolve) => {
        chooseResolveRef.current = resolve;
      });

    async function run() {
      setPhase("intro");
      await sleep(600);
      if (cancelled) return;

      const drawPromise = fetch(API_ENDPOINTS.RAFFLE_SELECT_WINNERS(raffleId), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Failed to draw winners");
        return (data.data?.winners ?? []) as RevealWinner[];
      });

      setPhase("shuffle");
      playSound("shuffle");
      setShuffleSeed((s) => s + 1);
      await sleep(4000);
      if (cancelled) return;

      await sleep(300); // settle beat

      let winners: RevealWinner[];
      try {
        winners = await drawPromise;
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to draw winners");
        setPhase("error");
        return;
      }
      if (cancelled) return;
      if (winners.length === 0) {
        setErrorMsg("No winners were selected.");
        setPhase("error");
        return;
      }
      setAllWinners(winners);

      setPhase("spotlight");
      await sleep(2000);
      if (cancelled) return;

      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];

        setPhase("choose");
        const cardIdx = await waitForCardChoice();
        if (cancelled) return;

        setActiveCardIndex(cardIdx);
        setCurrentWinner(winner);
        setPhase("glow");
        await sleep(1500);
        if (cancelled) return;

        setPhase("lift");
        await sleep(400);
        if (cancelled) return;

        setPhase("flip");
        playSound("spark");
        await sleep(1000);
        if (cancelled) return;

        setPhase("reveal");
        setRevealedCards((prev) => ({ ...prev, [cardIdx]: winner }));
        playSound("cheer");
        if (confettiRef.current) fireConfetti(confettiRef.current);
        await sleep(i === winners.length - 1 ? 1500 : 2200);
        if (cancelled) return;

        if (i < winners.length - 1) {
          setActiveCardIndex(null);
          setCurrentWinner(null);
          await sleep(500);
          if (cancelled) return;
        }
      }

      setActiveCardIndex(null);
      setPhase("celebrate");
      await sleep(5000);
    }

    run();
    return () => {
      cancelled = true;
      chooseResolveRef.current = null;
    };
  }, [raffleId]);

  const dimAll = phase === "glow" || phase === "lift" || phase === "flip" || phase === "reveal";

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold-400/30"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>

      {/* Soft golden ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.06),transparent_60%)] pointer-events-none" />

      {/* Spotlight sweep */}
      <AnimatePresence>
        {phase === "spotlight" && (
          <motion.div
            className="absolute inset-y-0 w-[40%] pointer-events-none"
            style={{
              background: "linear-gradient(100deg, transparent, rgba(250,204,21,0.18), transparent)",
              filter: "blur(20px)",
            }}
            initial={{ left: "-45%" }}
            animate={{ left: "105%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Fireworks during celebration */}
      {phase === "celebrate" &&
        Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full pointer-events-none"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 15}%`,
              background: "radial-gradient(circle, rgba(250,204,21,0.9), transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 8, 10], opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.6, delay: i * 0.35, repeat: Infinity, repeatDelay: 1.2 }}
          />
        ))}

      <canvas ref={confettiRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="relative w-full max-w-3xl px-6 flex flex-col items-center">
        {/* Title zone — a reserved-height flow element (not absolutely positioned) so the
            grid below always starts clear of it, no matter how many lines the phase's
            title/subtitle needs (e.g. celebrate's wrapped winner-chip row). */}
        <div className="min-h-[76px] sm:min-h-[92px] flex flex-col items-center justify-end pb-3 sm:pb-4 pointer-events-none w-full">
          <AnimatePresence>
            {phase === "choose" && (
              <motion.div
                key="choose-title"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-2xl sm:text-3xl font-black text-gold-400">🎯 Pick a Card</p>
                <p className="text-white/50 text-sm mt-1">
                  {allWinners.length > 1
                    ? `Choose a card to reveal winner #${Object.keys(revealedCards).length + 1} of ${allWinners.length}`
                    : "Choose a card to reveal the winner"}
                </p>
              </motion.div>
            )}
            {phase === "reveal" && currentWinner && (
              <motion.div
                key="single-winner-title"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-2xl sm:text-3xl font-black text-gold-400">🎉 Congratulations!</p>
                <p className="text-white text-lg sm:text-xl font-bold mt-1">{currentWinner.displayName}</p>
              </motion.div>
            )}
            {phase === "celebrate" && (
              <motion.div
                key="celebrate-title"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-black text-gold-400 mb-2">🎉 Congratulations!</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {allWinners.map((w) => (
                    <span key={w.id} className="text-white/80 text-sm bg-white/5 border border-white/10 rounded-full px-3 py-1">
                      #{w.position} {w.displayName}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase === "error" ? (
          <div className="text-center">
            <p className="text-red-400 font-semibold text-lg mb-4">{errorMsg}</p>
            <button
              onClick={() => onClose(false)}
              className="px-5 py-2.5 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
              {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <Card
                  key={i}
                  index={i}
                  phase={phase}
                  isActive={activeCardIndex === i}
                  isDimmed={dimAll && activeCardIndex !== i && !revealedCards[i]}
                  isFlipped={!!revealedCards[i] || (activeCardIndex === i && (phase === "flip" || phase === "reveal"))}
                  isSelectable={phase === "choose" && !revealedCards[i]}
                  winner={revealedCards[i] ?? (activeCardIndex === i ? currentWinner : null)}
                  keyframes={keyframeSets[i]}
                  onSelect={handleCardSelect}
                />
              ))}
            </div>

            {phase === "celebrate" && (
              <div className="text-center mt-8">
                <button
                  onClick={() => onClose(true)}
                  className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
