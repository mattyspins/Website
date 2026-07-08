"use client";

import { useEffect, useRef } from "react";

interface FireworksProps {
  durationMs?: number;
  colors?: string[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

// Self-contained canvas fireworks — periodic radial bursts, distinct from the
// falling Confetti effect. Cleans itself up, skips under prefers-reduced-motion.
export default function Fireworks({ durationMs = 4000, colors = ["#F7B52C", "#1565D8", "#D8D8DD", "#ffffff", "#fb7185"] }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let sparks: Spark[] = [];

    const burst = () => {
      const cx = width * (0.2 + Math.random() * 0.6);
      const cy = height * (0.15 + Math.random() * 0.35);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const count = 40 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 2 + Math.random() * 3.5;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          life: 0,
          maxLife: 50 + Math.random() * 20,
        });
      }
    };

    let raf: number;
    let burstTimer: ReturnType<typeof setInterval> | null = null;
    const start = performance.now();

    burst();
    burstTimer = setInterval(burst, 550);

    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      sparks.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.045; // gravity
        s.life++;
        const alpha = Math.max(0, 1 - s.life / s.maxLife);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      sparks = sparks.filter((s) => s.life < s.maxLife);

      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
        if (burstTimer) clearInterval(burstTimer);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (burstTimer) clearInterval(burstTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [durationMs, colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 61 }}
      aria-hidden="true"
    />
  );
}
