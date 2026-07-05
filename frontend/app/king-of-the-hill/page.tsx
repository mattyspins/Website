"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { kothApi, KothSession, KothRound, KothUser } from "@/lib/api/kingOfTheHill";
import { getSocket } from "@/lib/socket";

function uname(u: KothUser | null | undefined) {
  if (!u) return "?";
  return u.kickUsername ?? u.displayName;
}

function fmtMulti(m: string | null) {
  if (m === null) return "—";
  return `${Number(m).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function Avatar({ u, size, ring }: { u: KothUser | null | undefined; size: number; ring?: boolean }) {
  const n = uname(u);
  const inner = u?.avatarUrl ? (
    <img src={u.avatarUrl} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
  if (!ring) return inner;
  return (
    <div className="p-1 rounded-full bg-gradient-to-br from-gold-400 via-yellow-300 to-gold-500 shadow-[0_0_28px_rgba(245,158,11,0.5)]">
      {inner}
    </div>
  );
}

export default function KingOfTheHillPage() {
  const [session, setSession] = useState<KothSession | null>(null);
  const [loading, setLoading] = useState(true);
  const prevIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await kothApi.getActive();
      setSession(data ?? null);
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
    if (prevIdRef.current && prevIdRef.current !== session?.id) {
      socket.emit("leaveKoth", prevIdRef.current);
    }
    if (!session?.id) return;
    socket.emit("joinKoth", session.id);
    prevIdRef.current = session.id;

    const onUpdate = (updated: KothSession) => {
      if (updated.id !== session.id) return;
      setSession(updated.status === "OPEN" ? updated : null);
    };
    socket.on("koth:updated", onUpdate);
    return () => { socket.off("koth:updated", onUpdate); };
  }, [session?.id]);

  const entries = session?.entries ?? [];
  const kingEntry = entries.find((e) => e.status === "KING") ?? null;
  const kingRound = session?.rounds.find((r) => r.isKing) ?? null;
  const drawnEntry = entries.find((e) => e.status === "DRAWN") ?? null;
  const drawnRound = drawnEntry
    ? session?.rounds.find((r) => r.entryId === drawnEntry.id && !r.playedAt) ?? null
    : null;

  const climbs: KothRound[] = (session?.rounds ?? [])
    .filter((r) => r.playedAt)
    .sort((a, b) => Number(b.multiplier) - Number(a.multiplier));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Crown className="w-3.5 h-3.5" />
            Stream Game
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            KING <span className="text-gold-400">OF THE HILL</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Type <code className="bg-white/10 text-gold-300 px-1.5 py-0.5 rounded font-mono">!king</code> in Kick chat to join.
            Get drawn, call your slot with <code className="bg-white/10 text-gold-300 px-1.5 py-0.5 rounded font-mono">!slot &lt;name&gt;</code>, and land the biggest multiplier to claim the throne.
          </p>
        </motion.div>

        {!session ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center"
          >
            <Crown className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No King of the Hill live right now</p>
            <p className="text-gray-600 text-sm mt-1">Check back during the next stream 👊</p>
          </motion.div>
        ) : (
          <div className="space-y-6">

            {/* Live badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                {session.label || "Live"} · {entries.length} {entries.length === 1 ? "viewer" : "viewers"} joined
              </span>
            </div>

            {/* Current King */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-b from-gold-500/10 to-navy-800/60 border border-gold-500/25 rounded-2xl p-8 text-center"
            >
              {kingEntry && kingRound ? (
                <>
                  <Crown className="w-8 h-8 text-gold-400 mx-auto mb-3" />
                  <div className="flex justify-center mb-4">
                    <Avatar u={kingEntry.user} size={96} ring />
                  </div>
                  <p className="text-gold-400 text-2xl font-black">{uname(kingEntry.user)}</p>
                  {kingRound.slotName && <p className="text-gray-500 text-sm mt-1">{kingRound.slotName}</p>}
                  <p className="text-white font-black text-4xl mt-3">{fmtMulti(kingRound.multiplier)}</p>
                  <p className="text-gray-600 text-xs mt-2 uppercase tracking-widest">Reigning King</p>
                </>
              ) : (
                <>
                  <Crown className="w-10 h-10 text-gold-400/30 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">The throne is empty</p>
                  <p className="text-gray-600 text-sm mt-1">Waiting for the first challenger to climb the hill</p>
                </>
              )}
            </motion.div>

            {/* Currently climbing */}
            {drawnEntry && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 bg-navy-800/60 border border-gold-500/20 rounded-xl p-4"
              >
                <Avatar u={drawnEntry.user} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{uname(drawnEntry.user)} is climbing the hill</p>
                  <p className="text-gold-400 text-xs mt-0.5">
                    {drawnRound?.slotName ? `🎰 Playing ${drawnRound.slotName}` : "🎯 Waiting for their !slot call…"}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Climbs / leaderboard */}
            <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Climbs this session</p>
              {climbs.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No results yet — be the first to climb!</p>
              ) : (
                <div className="space-y-1.5">
                  {climbs.map((r, i) => (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                        r.isKing ? "bg-gold-500/8 border-gold-500/20" : "bg-white/3 border-white/5"
                      }`}
                    >
                      <span className="text-gray-600 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                      <Avatar u={r.user} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-200 text-sm font-medium truncate">{uname(r.user)}</p>
                        {r.slotName && <p className="text-gray-600 text-xs truncate">{r.slotName}</p>}
                      </div>
                      <span className={`text-sm font-black shrink-0 ${r.isKing ? "text-gold-400" : "text-gray-500"}`}>
                        {r.isKing && "👑 "}{fmtMulti(r.multiplier)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
