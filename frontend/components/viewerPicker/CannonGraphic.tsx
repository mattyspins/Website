"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export type CannonStage =
  | "hidden"
  | "entering"
  | "settling"
  | "idle"
  | "charging"
  | "searching"
  | "lockon"
  | "firing"
  | "done";

interface CannonGraphicProps {
  stage: CannonStage;
  angle: number;
  laserColor: "cyan" | "red" | "none";
  laserLength?: number;
  size?: number;
}

export default function CannonGraphic({ stage, angle, laserColor, laserLength = 480, size = 150 }: CannonGraphicProps) {
  const charging = stage === "charging" || stage === "searching" || stage === "lockon";
  const firing = stage === "firing";
  const settling = stage === "settling";

  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: stage === "hidden" ? 90 : 0, opacity: stage === "hidden" ? 0 : 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={settling ? { x: [0, -3, 3, -2, 2, 0], y: [0, 2, -1, 1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <motion.div
          animate={firing ? { y: [0, 10, -2, 0] } : { y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 140 160"
            animate={{ rotate: angle }}
            transition={{ duration: 0.32, ease: EASE }}
            style={{ transformOrigin: "70px 128px", overflow: "visible" }}
          >
            <defs>
              <radialGradient id="cgCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e0f7ff" />
                <stop offset="40%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#7c3aed" />
              </radialGradient>
              <linearGradient id="cgBarrel" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3f4a5e" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="cgLaserCyan" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="cgLaserRed" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Laser sight — rides rigidly with the barrel since it's rotated by the same <svg> */}
            {laserColor !== "none" && (
              <motion.rect
                x={67}
                y={128 - laserLength}
                width={6}
                height={laserLength}
                fill={laserColor === "red" ? "url(#cgLaserRed)" : "url(#cgLaserCyan)"}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Wheels */}
            <circle cx="42" cy="140" r="12" fill="#1e293b" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="2" />
            <circle cx="98" cy="140" r="12" fill="#1e293b" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="2" />
            <circle cx="42" cy="140" r="4" fill="#334155" />
            <circle cx="98" cy="140" r="4" fill="#334155" />

            {/* Gear */}
            <motion.g
              animate={{ rotate: charging ? 360 : 0 }}
              transition={{ duration: charging ? 2.2 : 0, repeat: charging ? Infinity : 0, ease: "linear" }}
              style={{ transformOrigin: "112px 128px" }}
            >
              <circle cx="112" cy="128" r="8" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
              {Array.from({ length: 6 }).map((_, i) => (
                <rect key={i} x="110" y="118" width="4" height="4" fill="#fbbf24" transform={`rotate(${i * 60} 112 128)`} />
              ))}
            </motion.g>

            {/* Base */}
            <ellipse cx="70" cy="140" rx="38" ry="14" fill="#0f172a" stroke="#fbbf24" strokeOpacity="0.35" strokeWidth="1.5" />

            {/* Barrel */}
            <rect x="52" y="50" width="36" height="90" rx="14" fill="url(#cgBarrel)" stroke="#a855f7" strokeOpacity="0.5" strokeWidth="1.5" />
            {/* Brass bands */}
            <rect x="50" y="70" width="40" height="6" rx="3" fill="#b45309" opacity="0.8" />
            <rect x="50" y="100" width="40" height="6" rx="3" fill="#b45309" opacity="0.8" />

            {/* Muzzle ring */}
            <ellipse cx="70" cy="52" rx="20" ry="8" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.5" />

            {/* Glowing energy core */}
            <motion.circle
              cx="70"
              cy="54"
              r={charging ? 13 : 9}
              fill="url(#cgCore)"
              animate={{
                opacity: charging ? [0.7, 1, 0.7] : 0.85,
                r: charging ? [9, 16, 9] : 9,
              }}
              transition={{ duration: charging ? 0.5 : 0, repeat: charging ? Infinity : 0, ease: "easeInOut" }}
            />

            {/* Charging spiral sparks swirling into the chamber */}
            {charging &&
              Array.from({ length: 4 }).map((_, i) => (
                <motion.circle
                  key={i}
                  r="2"
                  fill="#c4b5fd"
                  animate={{
                    cx: [70, 70 + Math.cos(i * 1.6) * 22, 70],
                    cy: [54, 54 + Math.sin(i * 1.6) * 22, 54],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
                />
              ))}
          </motion.svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
