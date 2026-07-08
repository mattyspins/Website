"use client";

import { useEffect, useRef } from "react";

interface ConfettiProps {
  durationMs?: number;
  colors?: string[];
}

// A self-contained canvas confetti burst — no dependency, cleans itself up.
// Skips entirely under prefers-reduced-motion rather than just running quieter.
export default function Confetti({ durationMs = 3000, colors = ["#ef4444", "#fbbf24", "#f87171", "#ffffff", "#fde68a"] }: ConfettiProps) {
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

    const COUNT = 140;
    const pieces = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.6,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      speed: 2 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      for (const p of pieces) {
        p.y += p.speed;
        p.x += p.drift;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [durationMs, colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}
      aria-hidden="true"
    />
  );
}
