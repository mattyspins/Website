"use client";

import { useEffect, useState } from "react";

// Full-screen ambient background: a dark radial base with three soft drifting
// glow blobs, two swaying light beams, and a field of rising, twinkling
// particles — gold to match the site's accent, with a rare silver particle
// mixed in. Glows/beams are pure CSS (GPU-accelerated transform/opacity);
// particles carry randomized per-particle timing, so they're generated once
// on mount rather than during SSR to avoid a hydration mismatch — the first
// paint has just the glows/beams/base gradient, then particles fade in a
// moment later. Inert under prefers-reduced-motion.

const SILVER_CHANCE = 0.12;
const PARTICLE_COUNT = 34;

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  twinkleDuration: number;
  twinkleDelay: number;
  drift: number;
  peak: number;
  color: string;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const isSilver = Math.random() < SILVER_CHANCE;
    return {
      id: i,
      left: rand(0, 100),
      size: rand(2, 5),
      duration: rand(16, 32),
      delay: rand(-32, 0),
      twinkleDuration: rand(2, 4),
      twinkleDelay: rand(-4, 0),
      drift: rand(-70, 70),
      peak: rand(0.5, 0.95),
      color: isSilver ? "oklch(0.85 0.02 260)" : "oklch(0.78 0.15 80)",
    };
  });
}

export default function AuroraBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(makeParticles());
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none aurora-root"
      aria-hidden="true"
    >
      <div className="aurora-glow aurora-glow-a" />
      <div className="aurora-glow aurora-glow-b" />
      <div className="aurora-glow aurora-glow-c" />

      <div className="aurora-beam aurora-beam-a" />
      <div className="aurora-beam aurora-beam-b" />

      {particles.map((p) => (
        <div
          key={p.id}
          className="aurora-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            color: p.color,
            // @ts-expect-error -- CSS custom properties aren't in the style type
            "--drift": `${p.drift}px`,
            "--peak": p.peak,
            animation: `auroraParticleFloat ${p.duration}s linear infinite, auroraParticleTwinkle ${p.twinkleDuration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s, ${p.twinkleDelay}s`,
          }}
        />
      ))}

      <div className="aurora-vignette" />

      <style>{`
        .aurora-root {
          background: radial-gradient(ellipse 120% 90% at 50% -10%, #171125 0%, #0a0810 45%, #07070b 100%);
        }

        .aurora-glow {
          position: absolute;
          border-radius: 50%;
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }
        .aurora-glow-a {
          width: 70vw; height: 70vw; left: -15vw; top: -20vw;
          background: radial-gradient(circle, oklch(0.62 0.14 80 / 0.35) 0%, transparent 68%);
          animation: auroraGlowDrift1 26s ease-in-out infinite;
        }
        .aurora-glow-b {
          width: 60vw; height: 60vw; right: -12vw; bottom: -18vw;
          background: radial-gradient(circle, oklch(0.5 0.13 260 / 0.3) 0%, transparent 70%);
          animation: auroraGlowDrift2 34s ease-in-out infinite;
        }
        .aurora-glow-c {
          width: 45vw; height: 45vw; left: 32vw; top: 20vh;
          background: radial-gradient(circle, oklch(0.68 0.15 75 / 0.22) 0%, transparent 70%);
          animation: auroraGlowDrift3 20s ease-in-out infinite;
        }

        .aurora-beam {
          position: absolute;
          top: -20%;
          width: 26vw;
          height: 140%;
          transform-origin: top center;
          will-change: transform, opacity;
        }
        .aurora-beam-a {
          left: 8%;
          background: linear-gradient(180deg, oklch(0.75 0.14 82 / 0.16) 0%, transparent 75%);
          animation: auroraBeamSway1 22s ease-in-out infinite;
        }
        .aurora-beam-b {
          left: 62%; width: 22vw;
          background: linear-gradient(180deg, oklch(0.75 0.14 82 / 0.12) 0%, transparent 75%);
          animation: auroraBeamSway2 28s ease-in-out infinite;
        }

        .aurora-particle {
          position: absolute;
          bottom: -4%;
          border-radius: 50%;
          will-change: transform, opacity;
        }

        .aurora-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,0,0,0.55), transparent 70%);
        }

        @keyframes auroraGlowDrift1 {
          0%, 100% { transform: translate(-6%, -4%) scale(1); opacity: 0.55; }
          50% { transform: translate(4%, 3%) scale(1.15); opacity: 0.8; }
        }
        @keyframes auroraGlowDrift2 {
          0%, 100% { transform: translate(5%, 4%) scale(1); opacity: 0.4; }
          50% { transform: translate(-4%, -3%) scale(1.2); opacity: 0.65; }
        }
        @keyframes auroraGlowDrift3 {
          0%, 100% { transform: translate(0%, 0%) scale(1); opacity: 0.3; }
          50% { transform: translate(3%, -5%) scale(1.1); opacity: 0.5; }
        }
        @keyframes auroraBeamSway1 {
          0%, 100% { transform: rotate(-6deg) translateX(-2%); opacity: 0.35; }
          50% { transform: rotate(-2deg) translateX(2%); opacity: 0.55; }
        }
        @keyframes auroraBeamSway2 {
          0%, 100% { transform: rotate(7deg) translateX(2%); opacity: 0.22; }
          50% { transform: rotate(3deg) translateX(-2%); opacity: 0.4; }
        }
        @keyframes auroraParticleFloat {
          0% { transform: translate(0, 0); opacity: 0; }
          8% { opacity: var(--peak); }
          50% { transform: translate(var(--drift), -52vh); }
          92% { opacity: var(--peak); }
          100% { transform: translate(calc(var(--drift) * 1.6), -104vh); opacity: 0; }
        }
        @keyframes auroraParticleTwinkle {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 2px currentColor); }
          50% { filter: brightness(1.8) drop-shadow(0 0 5px currentColor); }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-glow, .aurora-beam, .aurora-particle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
