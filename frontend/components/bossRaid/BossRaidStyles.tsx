"use client";

// Shared keyframes for the Boss Raid arena — one scoped <style> block rendered once
// per page (admin dashboard + OBS widget both mount this), matching the inline
// <style>+@keyframes convention already used by AuroraBackground/RandomizerCannon.
export default function BossRaidStyles() {
  return (
    <style>{`
      @keyframes bossFloatUp { 0%{opacity:1; transform:translateY(0) scale(1);} 70%{opacity:1;} 100%{opacity:0; transform:translateY(-90px) scale(1.15);} }
      @keyframes bossShakeArena {
        0%,100%{transform:translate(0,0);} 10%{transform:translate(-6px,3px);} 20%{transform:translate(6px,-4px);}
        30%{transform:translate(-8px,2px);} 40%{transform:translate(7px,-3px);} 50%{transform:translate(-5px,4px);}
        60%{transform:translate(5px,-2px);} 70%{transform:translate(-4px,3px);} 80%{transform:translate(3px,-2px);} 90%{transform:translate(-2px,1px);}
      }
      @keyframes bossPulseGlow { 0%,100%{filter:drop-shadow(0 0 14px currentColor);} 50%{filter:drop-shadow(0 0 34px currentColor);} }
      @keyframes bossCoreSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
      @keyframes bossCoreSpinRev { from{transform:rotate(0deg);} to{transform:rotate(-360deg);} }
      @keyframes bossBurstParticle { 0%{opacity:1; transform:translate(0,0) scale(1);} 100%{opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.2);} }
      @keyframes bossFlashWhite { 0%{opacity:0.85;} 100%{opacity:0;} }
      @keyframes bossRingPulse { 0%,100%{opacity:0.5; transform:scale(1);} 50%{opacity:1; transform:scale(1.06);} }
      @keyframes bossRageBlink { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      @keyframes bossBannerIn { 0%{opacity:0; transform:translate(-50%,-20px) scale(0.9);} 15%{opacity:1; transform:translate(-50%,0) scale(1);} 85%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-10px) scale(0.95);} }
      @keyframes bossVictoryIn { 0%{opacity:0; transform:scale(0.92);} 100%{opacity:1; transform:scale(1);} }
      @keyframes bossFloatIdle { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
      @keyframes bossWingBeat { 0%,100%{transform:rotate(-4deg);} 50%{transform:rotate(4deg);} }
      @media (prefers-reduced-motion: reduce) {
        .boss-anim { animation: none !important; }
      }

      /* Responsive overrides — the page/components set desktop layout via inline
         styles, so these use !important to win over them at narrower widths
         rather than duplicating the whole style objects as classes. */
      @media (max-width: 1550px) {
        /* This page renders inside the admin shell, which has its own ~240px
           left sidebar eating into the viewport — the 320px/1fr/340px grid
           plus the arena's 420px-min middle column needs ~1550px of total
           window width to fit both without clipping the right column, not
           just ~1100px of its own content width. */
        .boss-raid-grid { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 640px) {
        .boss-header { padding: 10px 14px !important; flex-wrap: wrap !important; gap: 10px !important; }
        .boss-header-title { font-size: 13px !important; letter-spacing: 1px !important; }
        .boss-main { padding: 14px !important; }
        .boss-panel { padding: 14px !important; }
        .boss-arena-circle-outer { height: auto !important; padding: 20px 0 !important; }
        .boss-arena-circle { width: min(320px, 84vw) !important; height: min(320px, 84vw) !important; }
        .boss-bet-row { flex-direction: column !important; gap: 8px !important; }
        .boss-bet-divider { display: none !important; }
        .boss-stats-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        .boss-stats-row > div:last-child { text-align: left !important; }
        .boss-slot-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .boss-victory-card { padding: 24px 18px !important; }
        .boss-victory-stats { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 400px) {
        .boss-arena-circle { width: min(280px, 88vw) !important; height: min(280px, 88vw) !important; }
      }
    `}</style>
  );
}
