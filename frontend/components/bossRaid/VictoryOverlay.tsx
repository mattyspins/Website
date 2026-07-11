"use client";

import type { BossRaid } from "@/lib/api/bossRaid";
import { computeLeaderboard, raidStats } from "@/lib/bossRaidVisuals";
import { avColor } from "./Leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];
const REWARD_COINS = [250, 125, 125];

export default function VictoryOverlay({ raid, onClose }: { raid: BossRaid; onClose?: () => void }) {
  const leaderboard = computeLeaderboard(raid);
  const podium = leaderboard.slice(0, 3);
  const stats = raidStats(raid);

  return (
    <div style={{ position: "fixed", inset: 0, background: "oklch(0.08 0.01 260 / 0.93)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="boss-anim" style={{ animation: "bossVictoryIn 0.6s ease-out", textAlign: "center", background: "oklch(0.16 0.02 260)", border: "1px solid oklch(0.75 0.15 85 / 0.6)", borderRadius: 18, padding: "40px 50px", boxShadow: "0 0 80px oklch(0.75 0.15 85 / 0.35)", maxWidth: 640, width: "100%", position: "relative" }}>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 4, color: "oklch(0.8 0.14 85)" }}>
          {raid.defeated ? "BOSS DEFEATED" : "RAID ENDED"}
        </div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 32, margin: "6px 0 20px", background: "linear-gradient(90deg, oklch(0.85 0.15 85), oklch(0.8 0.14 60))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          {raid.boss.icon} {raid.boss.name} {raid.defeated ? "FELLED" : "CONCLUDED"}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 22, flexWrap: "wrap" }}>
          {podium.length === 0 && <div style={{ fontSize: 13, color: "oklch(0.6 0.02 260)" }}>No contributors this raid.</div>}
          {podium.map((p, i) => (
            <div
              key={p.entryId}
              style={{
                flex: "1 1 140px",
                background: "oklch(0.13 0.01 260)",
                border: `1px solid ${i === 0 ? "oklch(0.7 0.14 85 / 0.6)" : "oklch(0.3 0.03 260 / 0.5)"}`,
                borderRadius: 12,
                padding: "16px 12px",
                transform: i === 0 ? "translateY(-8px)" : "none",
                boxShadow: i === 0 ? "0 0 24px oklch(0.7 0.14 85 / 0.3)" : "none",
              }}
            >
              <div style={{ fontSize: 22 }}>{MEDALS[i]}</div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", margin: "8px auto 0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "oklch(0.98 0 0)", background: avColor(p.entryId) }}>
                {p.user.displayName[0]?.toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}>{p.user.displayName}</div>
              <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)" }}>🎰 {p.slotName ?? "—"}</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 15, color: "oklch(0.85 0.14 85)", marginTop: 4 }}>{p.damage.toLocaleString()} dmg</div>
              <div style={{ fontSize: 12, color: "oklch(0.8 0.13 85)", fontWeight: 700, marginTop: 2 }}>🪙 {REWARD_COINS[i]} coins</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, textAlign: "left", marginBottom: 24 }}>
          <div style={{ background: "oklch(0.13 0.01 260)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "oklch(0.6 0.02 260)", letterSpacing: 1 }}>TOTAL DMG</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif" }}>{stats.totalDamage.toLocaleString()}</div>
          </div>
          <div style={{ background: "oklch(0.13 0.01 260)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "oklch(0.6 0.02 260)", letterSpacing: 1 }}>BIGGEST HIT</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif" }}>{stats.biggestHit.toLocaleString()}</div>
          </div>
          <div style={{ background: "oklch(0.13 0.01 260)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "oklch(0.6 0.02 260)", letterSpacing: 1 }}>TOP MULTI</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif" }}>{stats.highestMult.toLocaleString()}×</div>
          </div>
          <div style={{ background: "oklch(0.13 0.01 260)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "oklch(0.6 0.02 260)", letterSpacing: 1 }}>CRITS</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif" }}>{stats.critCount}</div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{ padding: "12px 28px", borderRadius: 8, border: "none", background: "linear-gradient(90deg, oklch(0.75 0.15 220), oklch(0.6 0.15 250))", color: "oklch(0.1 0.01 260)", fontFamily: "'Orbitron',sans-serif", fontWeight: 800, letterSpacing: 1, cursor: "pointer" }}
          >
            START NEW RAID
          </button>
        )}
      </div>
    </div>
  );
}
