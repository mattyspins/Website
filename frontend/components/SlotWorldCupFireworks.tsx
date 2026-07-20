"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0..1, counts down
  color: string;
}

const COLORS = ["#fbbf24", "#f59e0b", "#facc15", "#34d399", "#60a5fa", "#f472b6"];

/**
 * A lightweight canvas fireworks burst, meant to sit behind a completed
 * tournament's champion banner. Bursts spawn on an interval and self-clean —
 * there's no unbounded particle growth, so this is cheap enough to leave
 * running for as long as the completion view is on screen.
 *
 * Renders nothing under prefers-reduced-motion: the celebration is decorative,
 * not informational, so honoring that preference means skipping it entirely
 * rather than offering a "reduced" version of motion that's still motion.
 */
export default function SlotWorldCupFireworks({ height = 220 }: { height?: number }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];
    let width = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnBurst = () => {
      const cx = width * (0.2 + Math.random() * 0.6);
      const cy = height * (0.25 + Math.random() * 0.35);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 26;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 1.4 + Math.random() * 2.2;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
        });
      }
    };

    // First burst almost immediately, then on a steady interval. Capped total
    // so a long-open tab never accumulates more than a couple thousand
    // particles worth of draw calls per frame.
    const burstInterval = window.setInterval(spawnBurst, 1100);
    spawnBurst();

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      particles = particles.filter((p) => p.life > 0);
      if (particles.length > 900) particles = particles.slice(particles.length - 900);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045; // gravity
        p.vx *= 0.99;
        p.life -= 0.014;

        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(burstInterval);
      window.removeEventListener("resize", resize);
    };
  }, [reduce, height]);

  if (reduce) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 w-full"
      style={{ height }}
    />
  );
}
