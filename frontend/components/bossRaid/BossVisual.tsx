"use client";

import type { BossKey } from "@/lib/api/bossRaid";

interface BossVisualProps {
  bossKey: BossKey;
  coreColor: string;
  coreColorLight: string;
  visorColor: string;
}

// Per-boss CSS/clip-path creature art, ported directly from the approved reference
// design — one shared arena template, re-skinned per boss via color + shape only
// (no bespoke illustration assets).
export default function BossVisual({ bossKey, coreColor, coreColorLight, visorColor }: BossVisualProps) {
  if (bossKey === "mecha") {
    return (
      <div style={{ position: "relative", animation: "bossFloatIdle 5s ease-in-out infinite" }}>
        <div style={{ position: "absolute", left: -34, top: 120, width: 60, height: 80, background: "linear-gradient(135deg, oklch(0.42 0.02 250), oklch(0.28 0.01 250))", clipPath: "polygon(30% 0,100% 10%,100% 90%,30% 100%,0 70%,0 30%)", boxShadow: "inset 0 0 10px oklch(0 0 0 / 0.5)" }} />
        <div style={{ position: "absolute", right: -34, top: 120, width: 60, height: 80, background: "linear-gradient(225deg, oklch(0.42 0.02 250), oklch(0.28 0.01 250))", clipPath: "polygon(70% 0,100% 30%,100% 70%,70% 100%,0 90%,0 10%)", boxShadow: "inset 0 0 10px oklch(0 0 0 / 0.5)" }} />
        <div style={{ position: "relative", width: 250, height: 290, margin: "0 auto", background: "linear-gradient(160deg, oklch(0.5 0.015 250) 0%, oklch(0.32 0.01 255) 55%, oklch(0.22 0.01 255) 100%)", clipPath: "polygon(20% 0%, 80% 0%, 100% 18%, 96% 60%, 100% 75%, 78% 100%, 22% 100%, 4% 75%, 0% 60%, 4% 18%)", boxShadow: "0 20px 60px oklch(0 0 0 / 0.6)" }}>
          <div style={{ position: "absolute", left: "16%", right: "16%", top: "22%", height: 1.5, background: "oklch(0.6 0.02 250 / 0.5)" }} />
          <div style={{ position: "absolute", left: "12%", right: "12%", top: "70%", height: 1.5, background: "oklch(0.6 0.02 250 / 0.5)" }} />
          <div style={{ position: "absolute", left: "50%", top: "16%", transform: "translateX(-50%)", width: 116, height: 20, background: visorColor, borderRadius: 3, boxShadow: `0 0 22px ${visorColor}`, animation: "bossPulseGlow 2.2s ease-in-out infinite", color: visorColor }} />
          <div style={{ position: "absolute", left: "50%", top: "44%", transform: "translate(-50%,-50%)", width: 84, height: 84, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${coreColorLight}, ${coreColor} 60%, oklch(0.15 0.01 255) 100%)`, boxShadow: `0 0 40px ${coreColor}`, animation: "bossPulseGlow 1.8s ease-in-out infinite", color: coreColor }}>
            <div style={{ position: "absolute", inset: 14, borderRadius: "50%", border: "2px solid oklch(0.9 0.05 220 / 0.6)", animation: "bossCoreSpinRev 6s linear infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  if (bossKey === "inferno") {
    return (
      <div style={{ position: "relative", width: 400, height: 400, animation: "bossFloatIdle 5s ease-in-out infinite" }}>
        <div style={{ position: "absolute", left: -58, top: 70, width: 200, height: 230, transformOrigin: "100% 10%", animation: "bossWingBeat 4.5s ease-in-out infinite" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, oklch(0.44 0.15 34), oklch(0.27 0.1 26) 52%, oklch(0.16 0.06 22))", clipPath: "polygon(100% 4%, 2% 20%, 26% 34%, 4% 46%, 30% 60%, 8% 72%, 34% 84%, 14% 96%, 60% 92%, 100% 66%)", boxShadow: "0 0 40px oklch(0.55 0.18 35 / 0.32)", opacity: 0.97 }} />
        </div>
        <div style={{ position: "absolute", right: -58, top: 70, width: 200, height: 230, transformOrigin: "0 10%", animation: "bossWingBeat 4.5s ease-in-out infinite" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(245deg, oklch(0.44 0.15 34), oklch(0.27 0.1 26) 52%, oklch(0.16 0.06 22))", clipPath: "polygon(0 4%, 98% 20%, 74% 34%, 96% 46%, 70% 60%, 92% 72%, 66% 84%, 86% 96%, 40% 92%, 0 66%)", boxShadow: "0 0 40px oklch(0.55 0.18 35 / 0.32)", opacity: 0.97 }} />
        </div>

        <div style={{ position: "absolute", left: 112, top: 18, width: 20, height: 64, transformOrigin: "bottom", transform: "rotate(-30deg)", background: "linear-gradient(180deg, oklch(0.24 0.03 30), oklch(0.42 0.05 34))", clipPath: "polygon(38% 0,62% 0,100% 100%,0 100%)" }} />
        <div style={{ position: "absolute", right: 112, top: 18, width: 20, height: 64, transformOrigin: "bottom", transform: "rotate(30deg)", background: "linear-gradient(180deg, oklch(0.24 0.03 30), oklch(0.42 0.05 34))", clipPath: "polygon(38% 0,62% 0,100% 100%,0 100%)" }} />

        <div style={{ position: "absolute", left: "50%", top: 230, transform: "translateX(-50%)", width: 190, height: 170 }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg, oklch(0.42 0.14 34), oklch(0.26 0.09 26) 60%, oklch(0.15 0.05 22))", clipPath: "polygon(24% 0, 76% 0, 100% 46%, 82% 100%, 18% 100%, 0 46%)", boxShadow: "inset 0 0 26px oklch(0.08 0.04 20)" }} />
          <div style={{ position: "absolute", left: "50%", top: 36, transform: "translateX(-50%)", width: 2, height: 90, background: "oklch(0.58 0.13 36 / 0.55)", boxShadow: "0 0 8px oklch(0.6 0.16 40)", animation: "bossPulseGlow 2.8s ease-in-out infinite", color: "oklch(0.6 0.14 40)" }} />
        </div>

        <div style={{ position: "relative", width: 196, height: 250, margin: "44px auto 0" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 196, height: 250, background: "linear-gradient(158deg, oklch(0.52 0.15 40) 0%, oklch(0.34 0.11 28) 52%, oklch(0.2 0.07 22) 100%)", clipPath: "polygon(50% 100%, 14% 78%, 2% 46%, 12% 24%, 30% 12%, 50% 6%, 70% 12%, 88% 24%, 98% 46%, 86% 78%)", boxShadow: "0 12px 40px oklch(0 0 0 / 0.5), inset 0 0 30px oklch(0.1 0.05 20)" }} />
          <div style={{ position: "absolute", left: 30, top: 92, width: 52, height: 26, background: `radial-gradient(circle at 50% 50%, ${coreColorLight}, ${visorColor} 62%, oklch(0.2 0.06 20))`, clipPath: "polygon(0 55%, 40% 8%, 100% 30%, 96% 78%, 44% 100%)", boxShadow: `0 0 20px ${visorColor}`, animation: "bossPulseGlow 2s ease-in-out infinite", color: visorColor }} />
          <div style={{ position: "absolute", right: 30, top: 92, width: 52, height: 26, background: `radial-gradient(circle at 50% 50%, ${coreColorLight}, ${visorColor} 62%, oklch(0.2 0.06 20))`, clipPath: "polygon(100% 55%, 60% 8%, 0 30%, 4% 78%, 56% 100%)", boxShadow: `0 0 20px ${visorColor}`, animation: "bossPulseGlow 2s ease-in-out infinite", color: visorColor }} />
          <div style={{ position: "absolute", left: "50%", top: 132, transform: "translateX(-50%)", width: 104, height: 110, background: "linear-gradient(165deg, oklch(0.46 0.13 36), oklch(0.28 0.09 26) 60%, oklch(0.17 0.06 22))", clipPath: "polygon(18% 0, 82% 0, 100% 40%, 70% 100%, 30% 100%, 0 40%)", boxShadow: "inset 0 0 18px oklch(0.08 0.04 20)" }}>
            <div style={{ position: "absolute", left: 26, top: 24, width: 12, height: 16, borderRadius: "50%", background: `radial-gradient(circle, ${coreColorLight}, ${coreColor} 70%, oklch(0.12 0.04 20))`, boxShadow: `0 0 12px ${coreColor}`, animation: "bossPulseGlow 1.6s ease-in-out infinite", color: coreColor }} />
            <div style={{ position: "absolute", right: 26, top: 24, width: 12, height: 16, borderRadius: "50%", background: `radial-gradient(circle, ${coreColorLight}, ${coreColor} 70%, oklch(0.12 0.04 20))`, boxShadow: `0 0 12px ${coreColor}`, animation: "bossPulseGlow 1.6s ease-in-out infinite", color: coreColor }} />
          </div>
          <div style={{ position: "absolute", left: "50%", top: 214, transform: "translateX(-50%)", display: "flex", gap: 3 }}>
            {[16, 22, 14, 22, 16].map((h, i) => (
              <div key={i} style={{ width: i % 2 === 0 ? 9 : 11, height: h, background: "linear-gradient(180deg, oklch(0.95 0.02 60), oklch(0.7 0.03 50))", clipPath: "polygon(50% 100%,0 0,100% 0)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (bossKey === "frost") {
    return (
      <div style={{ position: "relative", width: 300, height: 320, animation: "bossFloatIdle 6s ease-in-out infinite" }}>
        <div style={{ position: "absolute", left: 24, top: 36, width: 40, height: 100, background: "linear-gradient(180deg, oklch(0.85 0.08 220), oklch(0.5 0.1 235))", clipPath: "polygon(50% 0,100% 100%,0 100%)", boxShadow: "0 0 20px oklch(0.8 0.1 220 / 0.5)" }} />
        <div style={{ position: "absolute", right: 24, top: 36, width: 40, height: 100, background: "linear-gradient(180deg, oklch(0.85 0.08 220), oklch(0.5 0.1 235))", clipPath: "polygon(50% 0,100% 100%,0 100%)", boxShadow: "0 0 20px oklch(0.8 0.1 220 / 0.5)" }} />
        <div style={{ position: "relative", width: 230, height: 290, margin: "0 auto", background: "linear-gradient(160deg, oklch(0.82 0.09 218), oklch(0.52 0.11 232) 55%, oklch(0.32 0.08 242))", clipPath: "polygon(30% 0,70% 0,90% 22%,78% 46%,94% 70%,68% 100%,32% 100%,6% 70%,22% 46%,10% 22%)", boxShadow: "0 0 55px oklch(0.75 0.12 220 / 0.5), inset 0 0 32px oklch(0.95 0.05 220 / 0.35)" }}>
          <div style={{ position: "absolute", left: 38, top: 110, width: 40, height: 14, background: visorColor, boxShadow: `0 0 20px ${visorColor}`, borderRadius: 3, transform: "skewX(-12deg)", animation: "bossPulseGlow 2.4s ease-in-out infinite", color: visorColor }} />
          <div style={{ position: "absolute", right: 38, top: 110, width: 40, height: 14, background: visorColor, boxShadow: `0 0 20px ${visorColor}`, borderRadius: 3, transform: "skewX(12deg)", animation: "bossPulseGlow 2.4s ease-in-out infinite", color: visorColor }} />
        </div>
      </div>
    );
  }

  if (bossKey === "storm") {
    return (
      <div style={{ position: "relative", width: 320, height: 320, animation: "bossFloatIdle 4.5s ease-in-out infinite" }}>
        <div style={{ position: "absolute", left: "50%", top: 20, transform: "translateX(-50%)", width: 300, height: 190, background: "radial-gradient(circle at 35% 40%, oklch(0.42 0.1 292), oklch(0.22 0.08 285))", borderRadius: "52% 48% 46% 54% / 62% 62% 40% 40%", boxShadow: "0 0 44px oklch(0.5 0.14 292 / 0.4)" }} />
        <div style={{ position: "absolute", left: "50%", top: 130, transform: "translateX(-50%)", width: 220, height: 170, background: "radial-gradient(circle at 60% 30%, oklch(0.38 0.09 288), oklch(0.2 0.07 284))", borderRadius: "50% 50% 48% 52% / 40% 40% 60% 60%", boxShadow: "0 0 30px oklch(0.45 0.12 290 / 0.35)" }} />
        <div style={{ position: "absolute", left: "50%", top: 118, transform: "translateX(-50%)", width: 70, height: 150, background: coreColor, clipPath: "polygon(52% 0,18% 46%,46% 46%,14% 100%,82% 40%,54% 40%,82% 0)", boxShadow: `0 0 34px ${coreColor}`, animation: "bossPulseGlow 1.2s ease-in-out infinite", color: coreColor }} />
        <div style={{ position: "absolute", left: 96, top: 96, width: 34, height: 14, background: visorColor, boxShadow: `0 0 18px ${visorColor}`, clipPath: "polygon(0 40%,100% 0,90% 100%,10% 100%)", animation: "bossPulseGlow 1.5s ease-in-out infinite", color: visorColor }} />
        <div style={{ position: "absolute", right: 96, top: 96, width: 34, height: 14, background: visorColor, boxShadow: `0 0 18px ${visorColor}`, clipPath: "polygon(0 0,100% 40%,90% 100%,10% 100%)", animation: "bossPulseGlow 1.5s ease-in-out infinite", color: visorColor }} />
      </div>
    );
  }

  if (bossKey === "shadow") {
    return (
      <div style={{ position: "relative", width: 300, height: 340, animation: "bossFloatIdle 6s ease-in-out infinite" }}>
        <div style={{ position: "absolute", right: 26, top: 0, width: 6, height: 320, background: "linear-gradient(180deg, oklch(0.4 0.03 300), oklch(0.2 0.02 300))", transform: "rotate(10deg)", borderRadius: 3 }} />
        <div style={{ position: "relative", width: 230, height: 320, margin: "0 auto", background: "linear-gradient(180deg, oklch(0.26 0.06 302), oklch(0.11 0.03 296))", clipPath: "polygon(50% 0, 74% 8%, 66% 30%, 92% 56%, 100% 100%, 0 100%, 8% 56%, 34% 30%, 26% 8%)", boxShadow: "0 0 44px oklch(0.4 0.13 300 / 0.4)" }}>
          <div style={{ position: "absolute", left: "50%", top: 36, transform: "translateX(-50%)", width: 96, height: 130, background: "radial-gradient(circle at 50% 30%, oklch(0.09 0.02 300), oklch(0.04 0.01 300))", clipPath: "polygon(50% 0,82% 24%,72% 100%,28% 100%,18% 24%)" }}>
            <div style={{ position: "absolute", left: 20, top: 52, width: 20, height: 20, borderRadius: "50%", background: visorColor, boxShadow: `0 0 18px ${visorColor}`, animation: "bossPulseGlow 2s ease-in-out infinite", color: visorColor }} />
            <div style={{ position: "absolute", right: 20, top: 52, width: 20, height: 20, borderRadius: "50%", background: visorColor, boxShadow: `0 0 18px ${visorColor}`, animation: "bossPulseGlow 2s ease-in-out infinite", color: visorColor }} />
          </div>
        </div>
      </div>
    );
  }

  // void
  return (
    <div style={{ position: "relative", width: 340, height: 340, animation: "bossFloatIdle 7s ease-in-out infinite" }}>
      <div style={{ position: "absolute", left: 10, top: 40, width: 120, height: 32, background: "linear-gradient(90deg, oklch(0.3 0.14 320), transparent)", clipPath: "polygon(0 40%,100% 0,100% 100%,0 60%)", transform: "rotate(-24deg)" }} />
      <div style={{ position: "absolute", right: 10, top: 40, width: 120, height: 32, background: "linear-gradient(270deg, oklch(0.3 0.14 320), transparent)", clipPath: "polygon(0 0,100% 40%,100% 60%,0 100%)", transform: "rotate(24deg)" }} />
      <div style={{ position: "relative", width: 230, height: 230, margin: "52px auto 0", borderRadius: "50%", background: "conic-gradient(from 0deg, oklch(0.32 0.15 320), oklch(0.26 0.16 280), oklch(0.42 0.14 342), oklch(0.28 0.15 300), oklch(0.32 0.15 320))", boxShadow: "0 0 55px oklch(0.45 0.16 320 / 0.5)", animation: "bossCoreSpin 20s linear infinite" }}>
        <div style={{ position: "absolute", inset: 44, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.05 0.02 300), oklch(0.13 0.06 300))", boxShadow: `inset 0 0 30px ${coreColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `radial-gradient(circle at 40% 35%, ${coreColorLight}, ${coreColor})`, boxShadow: `0 0 30px ${coreColor}`, animation: "bossPulseGlow 1.8s ease-in-out infinite", color: coreColor }} />
        </div>
      </div>
    </div>
  );
}
