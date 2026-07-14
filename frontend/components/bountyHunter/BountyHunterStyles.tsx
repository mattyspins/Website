"use client";

// Shared keyframes for the Bounty Hunter arena — one scoped <style> block rendered once
// per page (admin dashboard + public page + OBS widget), matching the same convention
// as BossRaidStyles.tsx.
export default function BountyHunterStyles() {
  return (
    <style>{`
      @keyframes bountyFloatUp { 0%{opacity:1; transform:translate(-50%,0) scale(1);} 70%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-90px) scale(1.15);} }
      @keyframes bountyShakeArena {
        0%,100%{transform:translate(0,0);} 20%{transform:translate(-4px,2px);} 40%{transform:translate(4px,-3px);}
        60%{transform:translate(-3px,2px);} 80%{transform:translate(2px,-1px);}
      }
      @keyframes bountyPulseGlow { 0%,100%{filter:drop-shadow(0 0 12px currentColor);} 50%{filter:drop-shadow(0 0 30px currentColor);} }
      @keyframes bountyFlashWhite { 0%{opacity:0.8;} 100%{opacity:0;} }
      @keyframes bountyBannerIn { 0%{opacity:0; transform:translate(-50%,-20px) scale(0.9);} 15%{opacity:1; transform:translate(-50%,0) scale(1);} 85%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-10px) scale(0.95);} }
      @keyframes bountyClaimIn { 0%{opacity:0; transform:scale(0.92);} 100%{opacity:1; transform:scale(1);} }
      @keyframes bountyRowFlash { 0%{background: oklch(0.4 0.13 80 / 0.55);} 100%{background: var(--rowbg);} }
      @keyframes bountyMarkerDrop { 0%{opacity:0; transform:translate(-50%,-50%) scale(2.6);} 60%{opacity:1;} 100%{opacity:1; transform:translate(-50%,-50%) scale(1);} }
      @keyframes bountyReticleSpin { from{transform:translate(-50%,-50%) rotate(0);} to{transform:translate(-50%,-50%) rotate(360deg);} }
      @keyframes bountyCrossSweep { 0%,100%{opacity:0.35;} 50%{opacity:0.75;} }
      @keyframes bountyPotShine { 0%,100%{text-shadow:0 0 14px oklch(0.75 0.16 80 / 0.5);} 50%{text-shadow:0 0 32px oklch(0.8 0.17 80 / 0.85);} }
      @keyframes bountyCoinFall { 0%{opacity:1; transform:translate(0,-40px) rotate(0);} 100%{opacity:0; transform:translate(var(--cx),260px) rotate(540deg);} }
      @media (prefers-reduced-motion: reduce) {
        .bounty-anim { animation: none !important; }
      }

      @media (max-width: 1550px) {
        .bounty-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 640px) {
        .bounty-header { padding: 10px 14px !important; flex-wrap: wrap !important; gap: 10px !important; }
        .bounty-header-title { font-size: 13px !important; letter-spacing: 1px !important; }
        .bounty-main { padding: 14px !important; }
        .bounty-panel { padding: 14px !important; }
        .bounty-reticle-outer { height: auto !important; padding: 20px 0 !important; }
        .bounty-reticle { width: min(300px, 84vw) !important; height: min(300px, 84vw) !important; }
        .bounty-bet-row { flex-direction: column !important; gap: 8px !important; }
        .bounty-bet-divider { display: none !important; }
        .bounty-slot-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .bounty-claim-card { padding: 24px 18px !important; }
        .bounty-claim-stats { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 400px) {
        .bounty-reticle { width: min(260px, 88vw) !important; height: min(260px, 88vw) !important; }
      }
    `}</style>
  );
}
