"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

// Bright core flash + expanding ring shockwave at the cannon's muzzle.
export function MuzzleFlash() {
  return (
    <div className="absolute left-1/2 pointer-events-none" style={{ bottom: "16%", transform: "translateX(-50%)" }}>
      <div className="relative w-4 h-4">
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 16, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, #fff 0%, #a5f3fc 35%, #22d3ee 60%, transparent 75%)" }}
        />
        <motion.div
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 30, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-cyan-300"
        />
      </div>
    </div>
  );
}

// A handful of soft blurred puffs drifting up and fading — the smoke trail left
// behind after the cannon fires.
export function SmokeBurst() {
  const puffs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 90,
        delay: Math.random() * 0.2,
        size: 28 + Math.random() * 30,
      })),
    []
  );

  return (
    <div className="absolute left-1/2 pointer-events-none" style={{ bottom: "14%", transform: "translateX(-50%)" }}>
      {puffs.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.x * 0.3, y: 0, opacity: 0.5, scale: 0.4 }}
          animate={{ x: p.x, y: -80 - Math.random() * 40, opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
          className="absolute rounded-full bg-white/25 blur-md"
          style={{ width: p.size, height: p.size, left: -p.size / 2, top: -p.size / 2 }}
        />
      ))}
    </div>
  );
}
