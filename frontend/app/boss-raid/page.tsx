"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { bossRaidApi, BossRaid } from "@/lib/api/bossRaid";
import { getSocket } from "@/lib/socket";
import { computeLeaderboard } from "@/lib/bossRaidVisuals";
import BossRaidStyles from "@/components/bossRaid/BossRaidStyles";
import BossArena from "@/components/bossRaid/BossArena";
import { Leaderboard } from "@/components/bossRaid/Leaderboard";
import VictoryOverlay from "@/components/bossRaid/VictoryOverlay";

export default function BossRaidPublicPage() {
  const [raid, setRaid] = useState<BossRaid | null>(null);
  const [completedRaid, setCompletedRaid] = useState<BossRaid | null>(null);
  const [loading, setLoading] = useState(true);
  const prevIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const active = await bossRaidApi.getActive();
      setRaid(active);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
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

    const onUpdate = (updated: BossRaid) => {
      if (updated.status === "COMPLETED") {
        if (raid.id === updated.id) { setRaid(null); setCompletedRaid(updated); }
        return;
      }
      if (updated.id !== raid.id) return;
      setRaid(updated);
    };
    socket.on("bossraid:updated", onUpdate);
    return () => { socket.off("bossraid:updated", onUpdate); };
  }, [raid?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: "oklch(0.13 0.015 260)" }}>
      <BossRaidStyles />
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Swords className="w-3.5 h-3.5" />
            Stream Game
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            COMMUNITY <span className="text-amber-400">BOSS RAID</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Type the raid keyword shown on stream to join. Get drawn, call your slot with{" "}
            <code className="bg-white/10 text-amber-300 px-1.5 py-0.5 rounded font-mono">!slot &lt;name&gt;</code>, and deal
            the most damage to top the leaderboard.
          </p>
        </motion.div>

        {!raid ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center"
          >
            <Swords className="w-10 h-10 text-amber-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No Boss Raid live right now</p>
            <p className="text-gray-600 text-sm mt-1">Check back during the next stream 👊</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start"
          >
            <BossArena raid={raid} />
            <Leaderboard rows={computeLeaderboard(raid)} />
          </motion.div>
        )}
      </div>

      {completedRaid && <VictoryOverlay raid={completedRaid} />}
    </div>
  );
}
