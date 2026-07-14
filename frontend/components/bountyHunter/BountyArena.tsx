"use client";

import type { BountyHunter } from "@/lib/api/bountyHunter";
import { heatInfo, computeBoard } from "@/lib/bountyHunterVisuals";

export interface ArenaEffect {
  key: number;
  bannerText: string | null;
  flashColor: string | null;
  shake: boolean;
}

interface BountyArenaProps {
  hunt: BountyHunter;
  effect?: ArenaEffect | null;
}

// Radial placement per heat tier — the API only ever exposes the qualitative heat
// bucket (never the raw distance), so markers land in a tier-sized ring rather than at
// an exact radius. Angle is spread by golden-angle increments per marker index for a
// stable, non-overlapping layout.
const TIER_RADIUS: Record<number, number> = { 5: 0.06, 4: 0.2, 3: 0.34, 2: 0.45, 1: 0.66, 0: 0.92 };
const GOLDEN_ANGLE = 2.399963;

export default function BountyArena({ hunt, effect }: BountyArenaProps) {
  const board = computeBoard(hunt);
  const currentEpochRounds = hunt.rounds.filter((r) => r.epoch === hunt.epoch && r.playedAt && !r.skipped);
  const latest = [...currentEpochRounds].sort((a, b) => (a.playedAt! < b.playedAt! ? 1 : -1))[0] ?? null;
  const latestHeat = latest ? heatInfo(latest.heat) : null;
  const leader = board[0] ?? null;

  return (
    <div key={effect?.key ?? 0} style={{ position: "relative", animation: effect?.shake ? "bountyShakeArena 0.45s ease-in-out" : "none" }}>
      {effect?.bannerText && (
        <div
          className="bounty-anim"
          style={{
            position: "fixed", top: 90, left: "50%", transform: "translate(-50%,0)", zIndex: 80,
            animation: "bountyBannerIn 2.6s ease forwards", fontFamily: "'Orbitron',sans-serif", fontWeight: 800,
            fontSize: 26, letterSpacing: 3, padding: "14px 34px", background: "oklch(0.18 0.03 70 / 0.92)",
            border: "1px solid oklch(0.78 0.16 80 / 0.7)", color: "oklch(0.86 0.16 80)",
            boxShadow: "0 0 40px oklch(0.7 0.18 80 / 0.5)", clipPath: "polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%)",
          }}
        >
          {effect.bannerText}
        </div>
      )}
      {effect?.flashColor && (
        <div className="bounty-anim" style={{ position: "fixed", inset: 0, background: effect.flashColor, zIndex: 70, pointerEvents: "none", animation: "bountyFlashWhite 0.5s ease-out forwards" }} />
      )}

      {/* WANTED poster */}
      <div style={{ position: "relative", marginBottom: 18, padding: "18px 22px", borderRadius: 14, background: "linear-gradient(160deg, oklch(0.22 0.03 70 / 0.9), oklch(0.16 0.02 65 / 0.9))", border: "1px solid oklch(0.5 0.1 75 / 0.5)", boxShadow: "inset 0 0 40px oklch(0.4 0.08 70 / 0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 5, color: "oklch(0.68 0.12 70)" }}>★ WANTED · DEAD OR ALIVE ★</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 2, color: "oklch(0.6 0.04 70)", marginTop: 2 }}>SECRET MULTIPLIER</div>
            <div className="bounty-anim" style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 52, lineHeight: 1, color: "oklch(0.86 0.16 80)", animation: "bountyPotShine 3s ease-in-out infinite" }}>
              ???<span style={{ fontSize: 30, color: "oklch(0.6 0.06 70)" }}>×</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, color: "oklch(0.6 0.04 70)" }}>BOUNTY REWARD</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 40, lineHeight: 1.05, color: "oklch(0.85 0.15 82)" }}>🪙 {hunt.pot.toLocaleString()}</div>
            <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 1, padding: "4px 12px", borderRadius: 999, background: "oklch(0.22 0.04 70)", border: "1px solid oklch(0.5 0.1 75 / 0.5)", color: "oklch(0.82 0.12 75)" }}>
              🎯 CLAIM ZONE ±{hunt.claimZone}×
            </div>
          </div>
        </div>
        {hunt.rolloverCount > 0 && (
          <div style={{ position: "absolute", top: -12, left: 22, fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, padding: "5px 12px", borderRadius: 6, background: "linear-gradient(90deg, oklch(0.55 0.18 30), oklch(0.6 0.16 45))", color: "oklch(0.98 0.02 60)", boxShadow: "0 4px 14px oklch(0.5 0.16 35 / 0.5)" }}>
            🔥 ROLLOVER ×{hunt.rolloverCount}
          </div>
        )}
      </div>

      {/* Reticle */}
      <div className="bounty-reticle-outer" style={{ position: "relative", width: "100%", height: 380, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="bounty-reticle" style={{ position: "relative", width: 340, height: 340 }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "100%", height: "100%", borderRadius: "50%", background: "radial-gradient(circle, oklch(0.22 0.03 240 / 0.35) 0%, oklch(0.15 0.02 70 / 0.1) 70%, transparent 100%)", border: "1px solid oklch(0.4 0.05 70 / 0.4)" }} />
          <div className="bounty-anim" style={{ position: "absolute", left: "50%", top: "50%", width: "90%", height: "90%", borderRadius: "50%", border: "2px dotted oklch(0.55 0.1 75 / 0.35)", animation: "bountyReticleSpin 40s linear infinite" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "45%", height: "45%", borderRadius: "50%", border: "2px dashed oklch(0.75 0.15 80 / 0.7)", background: "radial-gradient(circle, oklch(0.7 0.16 80 / 0.16), oklch(0.6 0.14 70 / 0.04) 75%, transparent)", boxShadow: "0 0 30px oklch(0.7 0.15 80 / 0.2)" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "20%", height: "20%", borderRadius: "50%", border: "1px solid oklch(0.65 0.2 30 / 0.7)", background: "radial-gradient(circle, oklch(0.6 0.22 30 / 0.22), transparent 80%)" }} />
          <div className="bounty-anim" style={{ position: "absolute", left: "50%", top: 0, width: 1.5, height: "100%", transform: "translateX(-50%)", background: "oklch(0.6 0.1 75 / 0.4)", animation: "bountyCrossSweep 4s ease-in-out infinite" }} />
          <div className="bounty-anim" style={{ position: "absolute", top: "50%", left: 0, height: 1.5, width: "100%", transform: "translateY(-50%)", background: "oklch(0.6 0.1 75 / 0.4)", animation: "bountyCrossSweep 4s ease-in-out infinite" }} />

          <div className="bounty-anim" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, oklch(0.35 0.06 80), oklch(0.16 0.03 70))", border: "2px solid oklch(0.7 0.15 80 / 0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 20, color: "oklch(0.85 0.16 80)", boxShadow: "0 0 26px oklch(0.7 0.15 80 / 0.5)", animation: "bountyPulseGlow 2.4s ease-in-out infinite" }}>?</div>

          {currentEpochRounds.map((r, i) => {
            const heat = heatInfo(r.heat);
            const rNorm = TIER_RADIUS[heat.tier] ?? 0.9;
            const R = 47;
            const ang = i * GOLDEN_ANGLE;
            const x = 50 + Math.cos(ang) * rNorm * R;
            const y = 50 + Math.sin(ang) * rNorm * R;
            const isLatest = r.id === latest?.id;
            return (
              <div
                key={r.id}
                title={`${r.user.displayName} · ${r.multiplier}×`}
                className={isLatest ? "bounty-anim" : ""}
                style={{
                  position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                  width: isLatest ? 28 : 22, height: isLatest ? 28 : 22, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif",
                  fontWeight: 800, fontSize: 10, color: "oklch(0.14 0.01 70)", background: heat.color,
                  border: "2px solid oklch(0.14 0.02 70)", boxShadow: `0 0 12px ${heat.color}${isLatest ? `, 0 0 26px ${heat.color}` : ""}`,
                  zIndex: isLatest ? 26 : 22, animation: isLatest ? "bountyMarkerDrop 0.5s ease-out" : "none",
                }}
              >
                {r.user.displayName[0]?.toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Latest shot readout */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderRadius: 12, background: "oklch(0.16 0.02 65 / 0.8)", border: "1px solid oklch(0.35 0.05 75 / 0.35)" }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 2, color: "oklch(0.6 0.04 70)", whiteSpace: "nowrap" }}>LATEST SHOT</div>
        {latest && latestHeat ? (
          <>
            <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "oklch(0.98 0 0)", background: latestHeat.color }}>
              {latest.user.displayName[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {latest.user.displayName} · <span style={{ color: "oklch(0.62 0.04 70)" }}>🎰 {latest.slotName ?? "—"}</span>
              </div>
            </div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 22, color: "oklch(0.92 0.02 80)" }}>{latest.multiplier}×</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 999, color: latestHeat.color, background: "oklch(0.16 0.03 70 / 0.8)", border: `1px solid ${latestHeat.color}`, whiteSpace: "nowrap" }}>{latestHeat.label}</div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: "oklch(0.55 0.03 70)" }}>Waiting for the first shot of the round…</div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <div style={{ background: "oklch(0.16 0.02 65 / 0.75)", border: "1px solid oklch(0.35 0.05 75 / 0.35)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.58 0.03 70)" }}>SHOTS FIRED</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 24, color: "oklch(0.9 0.02 80)" }}>{currentEpochRounds.length}</div>
        </div>
        <div style={{ background: "oklch(0.16 0.02 65 / 0.75)", border: "1px solid oklch(0.35 0.05 75 / 0.35)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.58 0.03 70)" }}>CLAIM ZONE</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 24, color: "oklch(0.85 0.13 80)" }}>±{hunt.claimZone}×</div>
        </div>
        <div style={{ background: "oklch(0.16 0.02 65 / 0.75)", border: "1px solid oklch(0.35 0.05 75 / 0.35)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.58 0.03 70)" }}>CLOSEST SO FAR</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 16, color: leader ? leader.heat.color : "oklch(0.5 0.03 70)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {leader ? `${leader.user.displayName} · ${leader.multiplier}×` : "— none yet —"}
          </div>
        </div>
      </div>
    </div>
  );
}
