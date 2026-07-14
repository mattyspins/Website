"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { bountyHunterApi, BountyHunter } from "@/lib/api/bountyHunter";
import { getSocket } from "@/lib/socket";
import { computeBoard, computeCareerLeaderboard } from "@/lib/bountyHunterVisuals";
import BountyHunterStyles from "@/components/bountyHunter/BountyHunterStyles";
import BountyArena from "@/components/bountyHunter/BountyArena";
import { BountyBoard, TopHunters } from "@/components/bountyHunter/BountyBoard";
import ClaimOverlay from "@/components/bountyHunter/ClaimOverlay";

export default function BountyHunterPublicPage() {
  const [hunt, setHunt] = useState<BountyHunter | null>(null);
  const [completedHunt, setCompletedHunt] = useState<BountyHunter | null>(null);
  const [history, setHistory] = useState<BountyHunter[]>([]);
  const [loading, setLoading] = useState(true);
  const prevIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const active = await bountyHunterApi.getActive();
      setHunt(active);
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
    if (prevIdRef.current && prevIdRef.current !== hunt?.id) {
      socket.emit("leaveBountyHunter", prevIdRef.current);
    }
    if (!hunt?.id) return;
    socket.emit("joinBountyHunter", hunt.id);
    prevIdRef.current = hunt.id;

    const onUpdate = (updated: BountyHunter) => {
      if (updated.status === "SETTLED") {
        if (hunt.id === updated.id) { setHunt(null); setCompletedHunt(updated); setHistory((prev) => [updated, ...prev]); }
        return;
      }
      if (updated.id !== hunt.id) return;
      setHunt(updated);
    };
    socket.on("bountyhunter:updated", onUpdate);
    return () => { socket.off("bountyhunter:updated", onUpdate); };
  }, [hunt?.id]);

  const careerRows = computeCareerLeaderboard(history);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: "oklch(0.13 0.012 70)" }}>
      <BountyHunterStyles />
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Target className="w-3.5 h-3.5" />
            Stream Game
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            COMMUNITY <span className="text-amber-400">BOUNTY HUNTER</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Type the bounty keyword shown on stream to join. Get drawn, play your slot, and land as close as
            possible to Matty&apos;s secret multiplier to claim the bounty 🎯
          </p>
        </motion.div>

        {!hunt ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center">
            <Target className="w-10 h-10 text-amber-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No Bounty Hunter live right now</p>
            <p className="text-gray-600 text-sm mt-1">Check back during the next stream 👊</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
            <BountyArena hunt={hunt} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <BountyBoard rows={computeBoard(hunt)} />
              <TopHunters rows={careerRows} />
            </div>
          </motion.div>
        )}
      </div>

      {completedHunt && <ClaimOverlay hunt={completedHunt} onClose={() => setCompletedHunt(null)} />}
    </div>
  );
}
