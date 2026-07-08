"use client";

interface MattySpinsMarkProps {
  size?: number;
  className?: string;
  ringClassName?: string;
  showRing?: boolean;
}

// SVG recreation of the brand badge (blue circle, segmented outer ring, gold "M",
// silver "$") — vector so it can scale and glow crisply inside the intro animation.
export default function MattySpinsMark({
  size = 120,
  className = "",
  ringClassName = "",
  showRing = true,
}: MattySpinsMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="msBgGradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#2E7CF6" />
          <stop offset="55%" stopColor="#1565D8" />
          <stop offset="100%" stopColor="#0C3E8C" />
        </radialGradient>
        <linearGradient id="msGoldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCD887" />
          <stop offset="100%" stopColor="#E8952C" />
        </linearGradient>
        <linearGradient id="msSilverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5F6F8" />
          <stop offset="100%" stopColor="#B9BCC4" />
        </linearGradient>
        <filter id="msGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer segmented ring */}
      {showRing && (
        <g className={ringClassName} style={{ transformOrigin: "60px 60px" }}>
          <circle
            cx="60"
            cy="60"
            r="57"
            stroke="#5CA0F2"
            strokeOpacity="0.45"
            strokeWidth="2.5"
            strokeDasharray="10 6"
            fill="none"
          />
        </g>
      )}

      {/* Inner track */}
      <circle cx="60" cy="60" r="49" stroke="#3C7DE0" strokeOpacity="0.4" strokeWidth="1" fill="none" />

      {/* Badge body */}
      <circle cx="60" cy="60" r="46" fill="url(#msBgGradient)" />

      {/* M + $ mark */}
      <g filter="url(#msGlow)">
        <path
          d="M32 78 V44 L45 62 L58 44 V78"
          stroke="url(#msGoldGradient)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M78 46 C 71 43, 65 47, 66 52 C 67 58, 82 58, 83 65 C 84 71, 76 75, 69 71"
          stroke="url(#msSilverGradient)"
          strokeWidth="6.5"
          strokeLinecap="round"
          fill="none"
        />
        <line x1="76" y1="40" x2="76" y2="78" stroke="url(#msSilverGradient)" strokeWidth="6.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
