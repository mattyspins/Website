"use client";

import { useMemo } from "react";
import type { BountyHunter } from "@/lib/api/bountyHunter";
import { avColor } from "./BountyBoard";
import { X } from "lucide-react";

// Only ever rendered for a SETTLED hunt (settle() falls through to rollover() instead
// of settling when nobody qualifies, so a claimed winner always exists here).
export default function ClaimOverlay({ hunt, onClose }: { hunt: BountyHunter; onClose?: () => void }) {
  const winner = useMemo(() => hunt.rounds.find((r) => r.entryId === hunt.winnerEntryId && r.qualifies) ?? null, [hunt]);
  const coins = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: 6 + Math.random() * 88,
      fontSize: 20 + Math.random() * 22,
      cx: (Math.random() - 0.5) * 160,
      duration: 1.4 + Math.random() * 1.4,
      delay: Math.random() * 0.8,
    })),
    [hunt.id]
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "oklch(0.08 0.01 70 / 0.93)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}>
      {coins.map((c) => (
        <div key={c.id} style={{ position: "absolute", left: `${c.left}%`, top: 0, fontSize: c.fontSize, ["--cx" as any]: `${c.cx}px`, animation: `bountyCoinFall ${c.duration}s ease-in ${c.delay}s forwards`, zIndex: 1 }}>🪙</div>
      ))}

      <div className="bounty-anim bounty-claim-card" style={{ animation: "bountyClaimIn 0.6s ease-out", textAlign: "center", background: "oklch(0.16 0.02 65)", border: "1px solid oklch(0.78 0.15 80 / 0.6)", borderRadius: 18, padding: "38px 50px", boxShadow: "0 0 80px oklch(0.75 0.15 80 / 0.35)", maxWidth: 600, width: "100%", position: "relative", zIndex: 2 }}>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid oklch(0.4 0.04 70 / 0.5)", background: "oklch(0.13 0.01 70 / 0.7)", color: "oklch(0.65 0.03 70)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        )}

        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 4, color: "oklch(0.8 0.14 80)" }}>🎯 BOUNTY CLAIMED</div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, color: "oklch(0.58 0.04 70)", marginTop: 16 }}>SECRET MULTIPLIER WAS</div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 52, lineHeight: 1, margin: "4px 0 20px", background: "linear-gradient(90deg, oklch(0.86 0.16 80), oklch(0.78 0.15 55))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          {hunt.target}×
        </div>

        {winner ? (
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "16px 22px", borderRadius: 14, background: "oklch(0.13 0.01 70)", border: "1px solid oklch(0.7 0.14 80 / 0.5)", marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, color: "oklch(0.98 0 0)", background: avColor(winner.entryId) }}>
                {winner.user.displayName[0]?.toUpperCase()}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 22 }}>{winner.user.displayName}</div>
                <div style={{ fontSize: 12, color: "oklch(0.62 0.03 70)" }}>🎰 {winner.slotName ?? "—"} · landed {winner.multiplier}×</div>
              </div>
            </div>

            <div className="bounty-claim-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, textAlign: "left", marginBottom: 24 }}>
              <div style={{ background: "oklch(0.13 0.01 70)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: "oklch(0.6 0.03 70)", letterSpacing: 1 }}>OFF BY</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif" }}>{winner.distance}×</div>
              </div>
              <div style={{ background: "oklch(0.13 0.01 70)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: "oklch(0.6 0.03 70)", letterSpacing: 1 }}>REWARD</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif", color: "oklch(0.85 0.14 82)" }}>🪙 {hunt.pot.toLocaleString()}</div>
              </div>
              <div style={{ background: "oklch(0.13 0.01 70)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: "oklch(0.6 0.03 70)", letterSpacing: 1 }}>SHOTS FIRED</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Orbitron',sans-serif" }}>{hunt.rounds.filter((r) => !r.skipped && r.playedAt && r.epoch === hunt.epoch).length}</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: "oklch(0.6 0.03 70)", marginBottom: 24 }}>No winning shot on record for this bounty.</div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            style={{ padding: "12px 28px", borderRadius: 8, border: "none", background: "linear-gradient(90deg, oklch(0.8 0.15 80), oklch(0.68 0.15 55))", color: "oklch(0.12 0.01 70)", fontFamily: "'Orbitron',sans-serif", fontWeight: 800, letterSpacing: 1, cursor: "pointer" }}
          >
            POST NEW BOUNTY
          </button>
        )}
      </div>
    </div>
  );
}
