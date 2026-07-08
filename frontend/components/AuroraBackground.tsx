"use client";

// Full-screen ambient background: a very dark base with slow-drifting, softly
// blurred aurora blobs (cyan / electric blue / purple). Replaces the previous
// gold particle-connection canvas — this is deliberately calm and understated,
// GPU-accelerated (transform/opacity only), and inert under prefers-reduced-motion.
export default function AuroraBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ background: "#0B0F14" }}
      aria-hidden="true"
    >
      <div className="aurora-blob aurora-blob-cyan" />
      <div className="aurora-blob aurora-blob-blue" />
      <div className="aurora-blob aurora-blob-purple" />

      <style>{`
        .aurora-blob {
          position: absolute;
          width: 65vw;
          height: 65vw;
          max-width: 1000px;
          max-height: 1000px;
          border-radius: 9999px;
          filter: blur(100px);
          opacity: 0.32;
          will-change: transform;
        }

        .aurora-blob-cyan {
          top: -5%;
          left: -5%;
          background: radial-gradient(circle at 50% 50%, #22d3ee 0%, transparent 65%);
          animation: auroraDriftA 32s ease-in-out infinite;
        }

        .aurora-blob-blue {
          top: 0%;
          right: -8%;
          background: radial-gradient(circle at 50% 50%, #2f7dfa 0%, transparent 65%);
          animation: auroraDriftB 38s ease-in-out infinite;
          animation-delay: -12s;
        }

        .aurora-blob-purple {
          bottom: -8%;
          left: 20%;
          background: radial-gradient(circle at 50% 50%, #a855f7 0%, transparent 65%);
          animation: auroraDriftC 27s ease-in-out infinite;
          animation-delay: -6s;
        }

        /* Each keyframe returns near its starting point so the loop has no visible seam. */
        @keyframes auroraDriftA {
          0%   { transform: translate(0%, 0%) scale(1); }
          25%  { transform: translate(8%, 6%) scale(1.08); }
          50%  { transform: translate(4%, 12%) scale(0.98); }
          75%  { transform: translate(-6%, 4%) scale(1.05); }
          100% { transform: translate(0%, 0%) scale(1); }
        }

        @keyframes auroraDriftB {
          0%   { transform: translate(0%, 0%) scale(1); }
          30%  { transform: translate(-10%, 5%) scale(1.06); }
          60%  { transform: translate(-4%, -8%) scale(1.02); }
          100% { transform: translate(0%, 0%) scale(1); }
        }

        @keyframes auroraDriftC {
          0%   { transform: translate(0%, 0%) scale(1); }
          33%  { transform: translate(6%, -6%) scale(1.05); }
          66%  { transform: translate(-5%, -3%) scale(0.97); }
          100% { transform: translate(0%, 0%) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-blob-cyan, .aurora-blob-blue, .aurora-blob-purple {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
