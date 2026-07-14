"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bountyHunterApi, BountyHunter } from "@/lib/api/bountyHunter";
import { getSocket } from "@/lib/socket";
import { computeBoard, computeCareerLeaderboard } from "@/lib/bountyHunterVisuals";
import BountyHunterStyles from "@/components/bountyHunter/BountyHunterStyles";
import BountyArena, { ArenaEffect } from "@/components/bountyHunter/BountyArena";
import { BountyBoard, TopHunters } from "@/components/bountyHunter/BountyBoard";
import ClaimOverlay from "@/components/bountyHunter/ClaimOverlay";

export default function BountyHunterWidgetPage() {
  const [hunt, setHunt] = useState<BountyHunter | null>(null);
  const [completedHunt, setCompletedHunt] = useState<BountyHunter | null>(null);
  const [history, setHistory] = useState<BountyHunter[]>([]);
  const [arenaEffect, setArenaEffect] = useState<ArenaEffect | null>(null);
  const prevIdRef = useRef<string | null>(null);
  const prevShotCountRef = useRef<number>(0);

  const load = useCallback(async () => {
    try {
      const active = await bountyHunterApi.getActive();
      setHunt(active);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (prevIdRef.current && prevIdRef.current !== hunt?.id) {
      socket.emit("leaveBountyHunter", prevIdRef.current);
    }
    if (!hunt?.id) return;

    socket.emit("joinBountyHunter", hunt.id);
    prevIdRef.current = hunt.id;
    prevShotCountRef.current = hunt.rounds.filter((r) => r.playedAt && !r.skipped).length;

    const onUpdate = (updated: BountyHunter) => {
      if (updated.status === "SETTLED") {
        setHunt(null);
        setCompletedHunt(updated);
        setHistory((prev) => [updated, ...prev]);
        return;
      }
      if (updated.id !== hunt.id) return;
      const shotCount = updated.rounds.filter((r) => r.playedAt && !r.skipped).length;
      if (shotCount > prevShotCountRef.current) {
        setArenaEffect({ key: Date.now(), bannerText: null, flashColor: null, shake: true });
      }
      prevShotCountRef.current = shotCount;
      setHunt(updated);
    };
    socket.on("bountyhunter:updated", onUpdate);
    return () => { socket.off("bountyhunter:updated", onUpdate); };
  }, [hunt?.id]);

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "radial-gradient(ellipse at 50% -10%, oklch(0.2 0.03 60) 0%, oklch(0.13 0.012 70) 55%)", color: "oklch(0.93 0.01 70)" }}>
      <BountyHunterStyles />

      {!hunt ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🎯</p>
            <p style={{ color: "oklch(0.5 0.02 70)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>No Active Bounty</p>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "22px 24px 40px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 22, alignItems: "start" }}>
          <BountyArena hunt={hunt} effect={arenaEffect} />
          <div style={{ position: "sticky", top: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <BountyBoard rows={computeBoard(hunt)} />
            <TopHunters rows={computeCareerLeaderboard(history)} />
          </div>
        </div>
      )}

      {completedHunt && <ClaimOverlay hunt={completedHunt} />}
    </div>
  );
}
