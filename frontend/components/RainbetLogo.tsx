"use client";

import Image from "next/image";

interface RainbetLogoProps {
  width?: number;
  height?: number;
  className?: string;
  animated?: boolean;
}

export default function RainbetLogo({
  width = 24,
  height = 24,
  className = "",
  animated = false,
}: RainbetLogoProps) {
  return (
    <div className={`relative ${className} ${animated ? "animate-pulse" : ""}`}>
      <Image
        src="/rainbet-logo.png"
        alt="Rainbet"
        width={width}
        height={height}
        className={`object-contain ${animated ? "drop-shadow-lg" : ""}`}
        priority
      />

      {/* Optional glow effect for animated version */}
      {animated && (
        <div
          className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-sm animate-ping"
          style={{
            width: width + 4,
            height: height + 4,
            left: -2,
            top: -2,
          }}
        />
      )}
    </div>
  );
}
