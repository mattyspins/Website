"use client";

import type { BossRaid } from "@/lib/api/bossRaid";
import { bossPalette, bossStatusInfo, hpPercent, phaseLabel } from "@/lib/bossRaidVisuals";

export default function HpStatusPanel({ raid }: { raid: BossRaid }) {
  const { hpBarGradient, hpBarGlow } = bossPalette(raid.boss, raid.phase);
  const { tags, weaknessText, weaknessHot } = bossStatusInfo(raid);
  const pct = hpPercent(raid);

  return (
    <div style={{ background: "oklch(0.17 0.02 260 / 0.75)", backdropFilter: "blur(8px)", border: "1px solid oklch(0.35 0.05 220 / 0.35)", borderRadius: 14, padding: "18px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, color: "oklch(0.7 0.1 220)" }}>
          PHASE {raid.phase} · {phaseLabel(raid.phase)}
        </div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 20, color: "oklch(0.92 0.01 260)" }}>
          {raid.currentHp.toLocaleString()} <span style={{ fontSize: 13, color: "oklch(0.6 0.02 260)", fontWeight: 600 }}>/ {raid.maxHp.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ height: 24, borderRadius: 6, background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.35 0.04 250 / 0.6)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: hpBarGradient, transition: "width 0.7s cubic-bezier(.2,.8,.2,1)", boxShadow: `0 0 16px ${hpBarGlow}` }} />
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.6 0.02 260)", marginBottom: 6 }}>RAGE METER</div>
          <div style={{ height: 12, borderRadius: 6, background: "oklch(0.1 0.01 260)", overflow: "hidden", border: "1px solid oklch(0.3 0.04 250 / 0.5)" }}>
            <div
              className="boss-anim"
              style={{
                height: "100%",
                width: `${raid.rage}%`,
                background: "linear-gradient(90deg, oklch(0.65 0.18 25), oklch(0.75 0.15 60))",
                transition: "width 0.4s ease",
                boxShadow: raid.rage >= 90 ? "0 0 14px oklch(0.7 0.18 25 / 0.8)" : "none",
                animation: raid.rage >= 90 ? "bossRageBlink 1s ease-in-out infinite" : "none",
              }}
            />
          </div>
        </div>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.6 0.02 260)", marginBottom: 6 }}>STATUS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.length === 0 && <div style={{ fontSize: 12, color: "oklch(0.5 0.02 260)" }}>— none —</div>}
            {tags.map((tag, i) => (
              <div
                key={i}
                className="boss-anim"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: `oklch(0.28 0.07 ${tag.hue} / 0.45)`,
                  color: `oklch(0.82 0.14 ${tag.hue})`,
                  border: `1px solid oklch(0.6 0.13 ${tag.hue} / 0.5)`,
                  animation: tag.blink ? "bossRageBlink 1s ease-in-out infinite" : "none",
                }}
              >
                {tag.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.6 0.02 260)", marginBottom: 6 }}>
            WEAKNESS · {raid.boss.passiveName}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: weaknessHot ? "oklch(0.78 0.16 45)" : "oklch(0.7 0.02 260)" }}>
            {weaknessText}
          </div>
        </div>
      </div>
    </div>
  );
}
