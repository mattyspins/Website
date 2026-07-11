"use client";

import type { LeaderboardRow } from "@/lib/bossRaidVisuals";

const MEDALS = ["🥇", "🥈", "🥉"];
const AV_COLORS = ["oklch(0.6 0.16 25)", "oklch(0.6 0.15 145)", "oklch(0.62 0.15 260)", "oklch(0.65 0.15 200)", "oklch(0.62 0.16 300)", "oklch(0.6 0.15 60)", "oklch(0.6 0.15 340)", "oklch(0.6 0.14 180)"];

function avColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

function rowBg(rank: number) {
  if (rank === 0) return "oklch(0.28 0.09 85 / 0.35)";
  if (rank === 1) return "oklch(0.26 0.05 250 / 0.4)";
  if (rank === 2) return "oklch(0.26 0.06 30 / 0.3)";
  return "oklch(0.14 0.015 260 / 0.6)";
}

export function Leaderboard({ rows, lastScoredEntryId }: { rows: LeaderboardRow[]; lastScoredEntryId?: string | null }) {
  return (
    <div style={{ background: "oklch(0.16 0.02 260 / 0.8)", backdropFilter: "blur(10px)", border: "1px solid oklch(0.35 0.05 220 / 0.35)", borderRadius: 14, padding: 18 }}>
      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 2, color: "oklch(0.8 0.13 85)", marginBottom: 4 }}>🏆 BOSS RAID LEADERBOARD</div>
      <div style={{ fontSize: 11, color: "oklch(0.55 0.02 260)", marginBottom: 14 }}>Ranked by total boss damage dealt</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.length === 0 && (
          <div style={{ fontSize: 13, color: "oklch(0.5 0.02 260)", padding: "20px 0", textAlign: "center" }}>
            No contributors yet — start drawing players from the admin dashboard.
          </div>
        )}
        {rows.map((row, i) => (
          <div
            key={row.entryId}
            className={row.entryId === lastScoredEntryId ? "boss-anim" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: rowBg(i),
              border: `1px solid ${i < 3 ? `oklch(0.6 0.12 ${i === 0 ? 85 : i === 1 ? 250 : 30} / 0.5)` : "oklch(0.3 0.03 260 / 0.4)"}`,
              boxShadow: i === 0 ? "0 0 18px oklch(0.7 0.14 85 / 0.25)" : "none",
            }}
          >
            <div style={{ fontSize: i < 3 ? 20 : 14, width: 26, textAlign: "center", color: "oklch(0.6 0.02 260)", fontFamily: "'Orbitron',sans-serif", fontWeight: 700 }}>
              {i < 3 ? MEDALS[i] : `${i + 1}.`}
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "oklch(0.98 0 0)", background: avColor(row.entryId) }}>
              {row.user.displayName[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "oklch(0.93 0.01 260)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.user.displayName}</div>
              <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>🎰 {row.slotName ?? "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 15, color: i === 0 ? "oklch(0.85 0.14 85)" : "oklch(0.9 0.01 260)" }}>
                {row.damage.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: "oklch(0.5 0.02 260)" }}>DMG</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardMini({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.length === 0 && <div style={{ fontSize: 12, color: "oklch(0.5 0.02 260)" }}>No contributors yet.</div>}
      {rows.slice(0, 6).map((row, i) => (
        <div key={row.entryId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: i < 3 ? rowBg(i) : "oklch(0.13 0.015 260)" }}>
          <div style={{ width: 24, textAlign: "center", fontSize: i < 3 ? 16 : 12 }}>{i < 3 ? MEDALS[i] : `${i + 1}.`}</div>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.user.displayName}</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 13, color: i === 0 ? "oklch(0.85 0.14 85)" : "oklch(0.85 0.01 260)" }}>
            {row.damage.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export { avColor };
