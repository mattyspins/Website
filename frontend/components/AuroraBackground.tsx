"use client";

// Full-screen ambient background: a very dark base with slow aurora "ribbons"
// (not soft circular blobs) drifting continuously from left to right, like a
// real aurora borealis curtain rippling sideways. Each ribbon is rendered
// twice, one tile-width apart, and the pair slides right in an infinite loop
// — when the leading copy exits off the right edge, the trailing copy has
// slid into the exact position the leading copy started in, so the loop has
// no visible seam or reset. GPU-accelerated (transform only), inert under
// prefers-reduced-motion.
const TILE_WIDTH = 1800;

export default function AuroraBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none aurora-root"
      aria-hidden="true"
    >
      <svg
        className="aurora-svg"
        viewBox="0 0 1800 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients start and end on the same color/opacity so the seam between
              tiled copies is perfectly continuous, not a dim band. */}
          <linearGradient id="auroraGradCyan" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="auroraGradPurple" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#A855F7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="auroraGradBlend" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#A855F7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
          </linearGradient>
          <filter id="auroraBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
        </defs>

        <g filter="url(#auroraBlur)">
          <g className="aurora-flow aurora-flow-a">
            <path
              className="aurora-ribbon"
              d="M -150,300 C 150,80 450,520 750,300 C 1050,80 1350,520 1650,300"
              fill="none"
              stroke="url(#auroraGradCyan)"
              strokeWidth="220"
              strokeLinecap="round"
            />
            <path
              className="aurora-ribbon"
              d="M -150,300 C 150,80 450,520 750,300 C 1050,80 1350,520 1650,300"
              transform={`translate(${-TILE_WIDTH},0)`}
              fill="none"
              stroke="url(#auroraGradCyan)"
              strokeWidth="220"
              strokeLinecap="round"
            />
          </g>

          <g className="aurora-flow aurora-flow-b">
            <path
              className="aurora-ribbon"
              d="M -150,620 C 200,860 550,370 900,620 C 1250,860 1600,370 1650,620"
              fill="none"
              stroke="url(#auroraGradPurple)"
              strokeWidth="240"
              strokeLinecap="round"
            />
            <path
              className="aurora-ribbon"
              d="M -150,620 C 200,860 550,370 900,620 C 1250,860 1600,370 1650,620"
              transform={`translate(${-TILE_WIDTH},0)`}
              fill="none"
              stroke="url(#auroraGradPurple)"
              strokeWidth="240"
              strokeLinecap="round"
            />
          </g>

          <g className="aurora-flow aurora-flow-c">
            <path
              className="aurora-ribbon"
              d="M -150,430 C 150,260 450,590 750,430 C 1050,260 1350,590 1650,430"
              fill="none"
              stroke="url(#auroraGradBlend)"
              strokeWidth="160"
              strokeLinecap="round"
            />
            <path
              className="aurora-ribbon"
              d="M -150,430 C 150,260 450,590 750,430 C 1050,260 1350,590 1650,430"
              transform={`translate(${-TILE_WIDTH},0)`}
              fill="none"
              stroke="url(#auroraGradBlend)"
              strokeWidth="160"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>

      <style>{`
        .aurora-root {
          background: #0B0F14;
        }
        .aurora-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .aurora-ribbon {
          opacity: 0.8;
        }
        .aurora-flow {
          will-change: transform;
        }
        .aurora-flow-a {
          animation: auroraFlow 42s linear infinite;
        }
        .aurora-flow-b {
          animation: auroraFlow 58s linear infinite;
          animation-delay: -20s;
        }
        .aurora-flow-c {
          animation: auroraFlow 34s linear infinite;
          animation-delay: -11s;
        }

        /* Slides exactly one tile-width to the right, then resets — since the
           trailing tile is one tile-width to the left of the leading tile,
           the reset lands on an identical frame and the loop reads as
           continuous, unbroken left-to-right drift. */
        @keyframes auroraFlow {
          from { transform: translateX(0px); }
          to   { transform: translateX(${TILE_WIDTH}px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-flow-a, .aurora-flow-b, .aurora-flow-c {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
