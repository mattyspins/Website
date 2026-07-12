"use client";

import type { BossRaid } from "@/lib/api/bossRaid";
import { bossPalette } from "@/lib/bossRaidVisuals";
import BossVisual from "./BossVisual";
import HpStatusPanel from "./HpStatusPanel";

export interface ArenaEffect {
  key: number;
  bannerText: string | null;
  flashColor: string | null;
  shake: boolean;
}

interface BossArenaProps {
  raid: BossRaid;
  effect?: ArenaEffect | null;
}

export default function BossArena({ raid, effect }: BossArenaProps) {
  const { coreColor, coreColorLight, visorColor } = bossPalette(raid.boss, raid.phase);

  return (
    <div key={effect?.key ?? 0} style={{ position: "relative", animation: effect?.shake ? "bossShakeArena 0.5s ease-in-out" : "none" }}>
      {effect?.bannerText && (
        <div
          className="boss-anim"
          style={{
            position: "fixed",
            top: 90,
            left: "50%",
            transform: "translate(-50%,0)",
            zIndex: 80,
            animation: "bossBannerIn 2.6s ease forwards",
            fontFamily: "'Orbitron',sans-serif",
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: 3,
            padding: "14px 34px",
            background: "oklch(0.18 0.03 260 / 0.9)",
            border: "1px solid oklch(0.75 0.16 25 / 0.7)",
            color: "oklch(0.85 0.16 25)",
            boxShadow: "0 0 40px oklch(0.6 0.2 25 / 0.5)",
            clipPath: "polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%)",
          }}
        >
          {effect.bannerText}
        </div>
      )}

      {effect?.flashColor && (
        <div className="boss-anim" style={{ position: "fixed", inset: 0, background: effect.flashColor, zIndex: 70, pointerEvents: "none", animation: "bossFlashWhite 0.5s ease-out forwards" }} />
      )}

      <div style={{ textAlign: "center", marginBottom: 2 }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 4, color: "oklch(0.65 0.1 220)" }}>
          RAID BOSS · {raid.boss.icon} {raid.boss.name}
        </div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 30, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(90deg, oklch(0.85 0.14 220), oklch(0.75 0.16 260))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          {raid.boss.passiveName}
        </div>
      </div>

      <div className="boss-arena-circle-outer" style={{ position: "relative", width: "100%", height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="boss-arena-circle" style={{ position: "relative", width: 420, height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 60, borderRadius: "50%", background: `radial-gradient(circle, ${coreColor} 0%, transparent 68%)`, opacity: 0.22, filter: "blur(24px)" }} />
          {raid.bossKey === "mecha" && (
            <>
              <div className="boss-anim" style={{ position: "absolute", inset: 16, border: "2px solid oklch(0.75 0.14 220 / 0.5)", borderRadius: "50%", animation: "bossRingPulse 2.4s ease-in-out infinite" }} />
              <div className="boss-anim" style={{ position: "absolute", inset: 38, border: "1.5px dashed oklch(0.75 0.14 220 / 0.4)", borderRadius: "50%", animation: "bossCoreSpin 14s linear infinite" }} />
            </>
          )}
          <BossVisual bossKey={raid.bossKey} coreColor={coreColor} coreColorLight={coreColorLight} visorColor={visorColor} />
        </div>
      </div>

      <HpStatusPanel raid={raid} />
    </div>
  );
}
