"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown } from "lucide-react";
import { wagerLeaderboardApi, MonthlyStandingRow, MonthlyHistoryEntry } from "@/lib/api/wagerLeaderboard";

function maskUsername(username: string): string {
  if (username.length <= 3) return username;
  const first = username[0];
  const last = username.slice(-2);
  const stars = "*".repeat(Math.min(username.length - 3, 10));
  return `${first}${stars}${last}`;
}

function fmtMoney(v: string): string {
  return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AvatarCircle({ row, size = "md" }: { row: { displayName: string; kickUsername: string | null; avatarUrl: string | null }; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-xl" };
  const name = row.kickUsername ?? row.displayName;
  if (row.avatarUrl) {
    return <img src={row.avatarUrl} alt="" className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`} />;
  }
  const colors = ["from-blue-500 to-blue-700", "from-yellow-500 to-yellow-700", "from-cyan-500 to-cyan-700", "from-indigo-500 to-indigo-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PodiumCard({ row, position }: { row: MonthlyStandingRow; position: 1 | 2 | 3 }) {
  const config = {
    1: { label: "1ST PLACE", topBorder: "#f59e0b", rankColor: "text-gold-400", height: "py-8", avatarSize: "lg" as const, scale: "scale-105 z-10" },
    2: { label: "2ND PLACE", topBorder: "#9ca3af", rankColor: "text-gray-300", height: "py-6", avatarSize: "md" as const, scale: "" },
    3: { label: "3RD PLACE", topBorder: "#c87941", rankColor: "text-orange-400", height: "py-6", avatarSize: "md" as const, scale: "" },
  };
  const c = config[position];
  const name = row.kickUsername ?? row.displayName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={`relative flex-1 bg-navy-800/80 backdrop-blur-sm border border-white/6 rounded-xl ${c.height} px-5 flex flex-col items-center text-center ${c.scale}`}
      style={{ borderTop: `3px solid ${c.topBorder}` }}
    >
      <span className={`absolute top-3 right-4 font-gaming font-bold text-2xl ${c.rankColor} opacity-60`}>#{position}</span>
      <AvatarCircle row={row} size={c.avatarSize} />
      <p className="text-gray-500 text-xs font-semibold tracking-widest mt-3 mb-1">{c.label}</p>
      <p className="text-white font-bold text-base mb-4">{maskUsername(name)}</p>
      <div className="w-full bg-navy-900/60 rounded-lg p-3 mb-3">
        <p className="text-gray-500 text-xs tracking-wider mb-1">WAGERED THIS MONTH</p>
        <p className="text-white font-bold text-lg font-gaming">{fmtMoney(row.wagered)}</p>
      </div>
      {row.points !== null && (
        <div>
          <p className="text-gray-500 text-xs tracking-wider mb-1">PRIZE</p>
          <p className="text-gold-400 font-bold text-xl">{row.points} pts</p>
          {!row.linked && <p className="text-gray-600 text-[10px] mt-1">Link your Razed account to claim</p>}
        </div>
      )}
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [standings, setStandings] = useState<MonthlyStandingRow[]>([]);
  const [history, setHistory] = useState<MonthlyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, h] = await Promise.all([wagerLeaderboardApi.getMonthly(), wagerLeaderboardApi.getMonthlyHistory()]);
        setStandings(s);
        setHistory(h);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  const [first, second, third, ...rest] = standings;
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Trophy className="w-3.5 h-3.5" />
            Monthly Wager Race
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            {monthLabel.split(" ")[0].toUpperCase()} <span className="text-gold-400">LEADERBOARD</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Ranked by wager on Razed this month — every player under our code counts. Top 10 win points automatically when the month ends (link your Razed account on your profile to claim).
          </p>
        </motion.div>

        {standings.length === 0 ? (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center mb-12">
            <Trophy className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No wagers recorded yet this month</p>
            <p className="text-gray-600 text-sm mt-1">Wagers sync automatically from Razed — check back soon</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            <div className="flex flex-col sm:flex-row items-end gap-3 mb-8">
              {second && <PodiumCard row={second} position={2} />}
              {first && <PodiumCard row={first} position={1} />}
              {third && <PodiumCard row={third} position={3} />}
            </div>

            {/* Rest of the list */}
            {rest.length > 0 && (
              <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-4 mb-12 space-y-1">
                {rest.map((row) => (
                  <div key={row.userId ?? row.displayName} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/3">
                    <span className="text-gray-600 text-sm w-6 shrink-0 text-right">#{row.position}</span>
                    <AvatarCircle row={row} size="sm" />
                    <span className="text-gray-200 text-sm font-medium flex-1 truncate">{maskUsername(row.kickUsername ?? row.displayName)}</span>
                    {row.points !== null && (
                      <span className="text-gold-400 text-xs font-bold shrink-0">
                        {row.points} pts{!row.linked && <span className="text-gray-600 font-normal ml-1">(link to claim)</span>}
                      </span>
                    )}
                    <span className="text-white text-sm font-semibold shrink-0">{fmtMoney(row.wagered)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Past winners */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" />
              Past Winners
            </p>
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.monthStart} className="bg-navy-800/50 border border-white/6 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-semibold mb-3">
                    {new Date(entry.monthStart).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.winners.map((w) => (
                      <div key={w.userId} className="flex items-center gap-2 bg-navy-900/60 border border-white/5 rounded-lg px-3 py-1.5">
                        <span className="text-gold-400 text-xs font-black">#{w.position}</span>
                        <span className="text-gray-200 text-xs">{maskUsername(w.kickUsername ?? w.displayName)}</span>
                        <span className="text-gold-400 text-xs font-bold">{w.pointsAwarded} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
