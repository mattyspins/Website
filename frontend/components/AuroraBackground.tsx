"use client";

// Full-screen ambient background: a very dark base with slow-flowing aurora
// "ribbons" (not soft circular blobs) — thick, blurred, gradient-stroked curves
// that drift and blend via screen-mode compositing, similar to a real aurora
// borealis curtain. GPU-accelerated (transform only), inert under
// prefers-reduced-motion.
export default function AuroraBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none aurora-root"
      aria-hidden="true"
    >
      <svg
        className="aurora-svg"
        viewBox="0 0 1200 1400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="auroraGradCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0" />
            <stop offset="35%" stopColor="#06B6D4" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#3B82F6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="auroraGradPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0" />
            <stop offset="40%" stopColor="#7C3AED" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#A855F7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="auroraGradBlend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0" />
            <stop offset="50%" stopColor="#A855F7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
          <filter id="auroraBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="55" />
          </filter>
        </defs>

        <g filter="url(#auroraBlur)">
          <path
            className="aurora-ribbon aurora-ribbon-a"
            d="M 780,-150 C 560,120 900,320 660,560 C 470,750 830,900 720,1150 C 650,1300 760,1420 700,1560"
            fill="none"
            stroke="url(#auroraGradCyan)"
            strokeWidth="220"
            strokeLinecap="round"
          />
          <path
            className="aurora-ribbon aurora-ribbon-b"
            d="M 380,-150 C 620,100 300,340 520,580 C 700,780 360,950 460,1180 C 520,1330 420,1450 470,1580"
            fill="none"
            stroke="url(#auroraGradPurple)"
            strokeWidth="240"
            strokeLinecap="round"
          />
          <path
            className="aurora-ribbon aurora-ribbon-c"
            d="M 560,-150 C 460,180 700,420 540,650 C 400,850 640,1020 540,1250 C 480,1370 560,1460 520,1580"
            fill="none"
            stroke="url(#auroraGradBlend)"
            strokeWidth="160"
            strokeLinecap="round"
          />
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
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform;
          opacity: 0.8;
        }
        .aurora-ribbon-a {
          animation: auroraRibbonA 34s ease-in-out infinite;
        }
        .aurora-ribbon-b {
          animation: auroraRibbonB 40s ease-in-out infinite;
          animation-delay: -14s;
        }
        .aurora-ribbon-c {
          animation: auroraRibbonC 28s ease-in-out infinite;
          animation-delay: -7s;
        }

        /* Each keyframe returns near its starting point so the loop has no visible seam. */
        @keyframes auroraRibbonA {
          0%   { transform: translate(0%, 0%) rotate(0deg) scale(1); }
          25%  { transform: translate(3%, -2%) rotate(2deg) scale(1.04); }
          50%  { transform: translate(-2%, 3%) rotate(-1.5deg) scale(0.98); }
          75%  { transform: translate(2%, 1%) rotate(1deg) scale(1.03); }
          100% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
        }
        @keyframes auroraRibbonB {
          0%   { transform: translate(0%, 0%) rotate(0deg) scale(1); }
          30%  { transform: translate(-3%, 2%) rotate(-2deg) scale(1.05); }
          60%  { transform: translate(2%, -3%) rotate(1.5deg) scale(0.97); }
          100% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
        }
        @keyframes auroraRibbonC {
          0%   { transform: translate(0%, 0%) rotate(0deg) scale(1); }
          33%  { transform: translate(2%, 2%) rotate(1.5deg) scale(1.03); }
          66%  { transform: translate(-2%, -2%) rotate(-1deg) scale(0.96); }
          100% { transform: translate(0%, 0%) rotate(0deg) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-ribbon-a, .aurora-ribbon-b, .aurora-ribbon-c {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
