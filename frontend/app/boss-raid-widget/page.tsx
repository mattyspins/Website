"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bossRaidApi, BossRaid } from "@/lib/api/bossRaid";
import { getSocket } from "@/lib/socket";
import { computeLeaderboard } from "@/lib/bossRaidVisuals";
import BossRaidStyles from "@/components/bossRaid/BossRaidStyles";
import BossArena, { ArenaEffect } from "@/components/bossRaid/BossArena";
import { Leaderboard } from "@/components/bossRaid/Leaderboard";
import VictoryOverlay from "@/components/bossRaid/VictoryOverlay";

export default function BossRaidWidgetPage() {
  const [raid, setRaid] = useState<BossRaid | null>(null);
  const [completedRaid, setCompletedRaid] = useState<BossRaid | null>(null);
  const [arenaEffect, setArenaEffect] = useState<ArenaEffect | null>(null);
  const prevIdRef = useRef<string | null>(null);
  const prevRoundCountRef = useRef<number>(0);

  const load = useCallback(async () => {
    try {
      const active = await bossRaidApi.getActive();
      setRaid(active);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (prevIdRef.current && prevIdRef.current !== raid?.id) {
      socket.emit("leaveBossRaid", prevIdRef.current);
    }
    if (!raid?.id) return;

    socket.emit("joinBossRaid", raid.id);
    prevIdRef.current = raid.id;
    prevRoundCountRef.current = raid.roundCount;

    const onUpdate = (updated: BossRaid) => {
      if (updated.status === "COMPLETED") {
        setRaid(null);
        setCompletedRaid(updated);
        return;
      }
      if (updated.id !== raid.id) return;
      // A new round resolved since our last snapshot — trigger the shake/flash cue.
      if (updated.roundCount > prevRoundCountRef.current) {
        setArenaEffect({ key: Date.now(), bannerText: null, flashColor: null, shake: true });
      }
      prevRoundCountRef.current = updated.roundCount;
      setRaid(updated);
    };
    socket.on("bossraid:updated", onUpdate);
    return () => { socket.off("bossraid:updated", onUpdate); };
  }, [raid?.id]);

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "radial-gradient(ellipse at 50% -10%, oklch(0.22 0.03 250) 0%, oklch(0.13 0.015 260) 55%)", color: "oklch(0.93 0.01 260)" }}>
      <BossRaidStyles />

      {!raid ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>⚔️</p>
            <p style={{ color: "oklch(0.5 0.02 260)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>No Active Raid</p>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "22px 24px 40px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 22, alignItems: "start" }}>
          <BossArena raid={raid} effect={arenaEffect} />
          <div style={{ position: "sticky", top: 22 }}>
            <Leaderboard rows={computeLeaderboard(raid)} />
          </div>
        </div>
      )}

      {completedRaid && <VictoryOverlay raid={completedRaid} />}
    </div>
  );
}
