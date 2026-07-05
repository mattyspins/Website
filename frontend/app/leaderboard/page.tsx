"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown } from "lucide-react";
import { wagerLeaderboardApi, ActiveRace, RaceHistoryEntry } from "@/lib/api/wagerLeaderboard";

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

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Races stay active through the end of endDate (UTC) — payouts run early the next day. */
function raceEndTimestamp(endDate: string): number {
  return new Date(`${endDate}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000;
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const msRemaining = Math.max(0, raceEndTimestamp(endDate) - now);
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (msRemaining <= 0) {
    return (
      <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest">Race ended — payouts processing</p>
    );
  }

  const segments = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Mins", value: minutes },
    { label: "Secs", value: seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-3">
      {segments.map((seg) => (
        <div key={seg.label} className="bg-navy-900/70 border border-white/8 rounded-xl px-4 py-2.5 min-w-[68px] text-center">
          <p className="text-2xl font-bold font-gaming text-gold-400 tabular-nums">{String(seg.value).padStart(2, "0")}</p>
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{seg.label}</p>
        </div>
      ))}
    </div>
  );
}

function rankBadgeClasses(position: number): string {
  if (position === 1) return "bg-gold-400 text-navy-950";
  if (position === 2) return "bg-gray-300 text-navy-950";
  if (position === 3) return "bg-orange-400 text-navy-950";
  return "bg-navy-900/80 border border-white/8 text-gray-400";
}

function rowTintClasses(position: number): string {
  if (position === 1) return "bg-gradient-to-r from-gold-500/10 via-transparent to-transparent";
  if (position === 2) return "bg-gradient-to-r from-gray-400/8 via-transparent to-transparent";
  if (position === 3) return "bg-gradient-to-r from-orange-500/8 via-transparent to-transparent";
  return "";
}

function AvatarCircle({ row }: { row: { displayName: string; kickUsername: string | null; avatarUrl: string | null } }) {
  const name = row.kickUsername ?? row.displayName;
  if (row.avatarUrl) {
    return <img src={row.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
  }
  const colors = ["from-blue-500 to-blue-700", "from-yellow-500 to-yellow-700", "from-cyan-500 to-cyan-700", "from-indigo-500 to-indigo-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function LeaderboardPage() {
  const [race, setRace] = useState<ActiveRace | null>(null);
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, h] = await Promise.all([wagerLeaderboardApi.getActive(), wagerLeaderboardApi.getHistory()]);
        setRace(r);
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

  const totalPrize = race?.prizes.reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Trophy className="w-3.5 h-3.5" />
            {race && totalPrize > 0 ? "Live Prize Pool" : "Wager Race"}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            {race && totalPrize > 0 ? (
              <>
                <span className="text-gold-400">${totalPrize.toLocaleString("en-US")}</span> WAGER RACE
              </>
            ) : (
              <>WAGER <span className="text-gold-400">LEADERBOARD</span></>
            )}
          </h1>
        </motion.div>

        {race && (
          <div className="mb-10">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest text-center mb-3">Race Ends In</p>
            <CountdownTimer endDate={race.endDate} />
          </div>
        )}

        {!race ? (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center mb-12">
            <Trophy className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No race is running right now</p>
            <p className="text-gray-600 text-sm mt-1">Check back soon for the next one</p>
          </div>
        ) : race.standings.length === 0 ? (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center mb-12">
            <Trophy className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No wagers recorded yet this race</p>
            <p className="text-gray-600 text-sm mt-1">Wagers sync automatically from Razed — check back soon</p>
          </div>
        ) : (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl overflow-hidden mb-12 shadow-card">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-white/6 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Player</div>
              <div className="col-span-3 text-right">Wagered</div>
              <div className="col-span-2 text-right">Prize</div>
            </div>
            {race.standings.map((row, i) => (
              <motion.div
                key={row.userId ?? row.displayName}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className={`grid grid-cols-12 px-5 py-3.5 items-center border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors ${rowTintClasses(row.position)}`}
              >
                <div className="col-span-1">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${rankBadgeClasses(row.position)}`}>
                    {row.position}
                  </span>
                </div>
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <AvatarCircle row={row} />
                  <span className="text-white font-medium text-sm truncate">{maskUsername(row.kickUsername ?? row.displayName)}</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-gray-300 text-sm font-semibold tabular-nums">{fmtMoney(row.wagered)}</span>
                </div>
                <div className="col-span-2 text-right">
                  {row.prizeAmount !== null ? (
                    <>
                      <span className="text-gold-400 font-bold text-sm">${row.prizeAmount}</span>
                      {!row.linked && <p className="text-gray-600 text-[10px] mt-0.5">link account to receive</p>}
                    </>
                  ) : (
                    <span className="text-gray-600 text-sm">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
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
                <div key={entry.id} className="bg-navy-800/50 border border-white/6 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-semibold mb-3">
                    {fmtDate(entry.startDate)} – {new Date(entry.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.winners.map((w) => (
                      <div key={w.userId} className="flex items-center gap-2 bg-navy-900/60 border border-white/5 rounded-lg pl-1.5 pr-3 py-1.5">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${rankBadgeClasses(w.position)}`}>
                          {w.position}
                        </span>
                        <span className="text-gray-200 text-xs">{maskUsername(w.kickUsername ?? w.displayName)}</span>
                        <span className="text-gold-400 text-xs font-bold">${w.prizeAmount}</span>
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
