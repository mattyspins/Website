"use client";

import Image from "next/image";

interface MattySpinsAvatarProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export default function MattySpinsAvatar({
  size = 128,
  className = "",
  showGlow = true,
}: MattySpinsAvatarProps) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/mattyspins-logo.png"
        alt="MattySpins"
        width={size}
        height={size}
        className={`rounded-full ${showGlow ? "shadow-2xl neon-glow" : ""}`}
        priority
      />

      {/* Animated border ring */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-500 via-neon-gold to-gold-500 opacity-75 animate-spin-slow -z-10 blur-sm"
          style={{
            width: size + 8,
            height: size + 8,
            left: -4,
            top: -4,
            animationDuration: "3s",
          }}
        />
      )}
    </div>
  );
}
