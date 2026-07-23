"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Calendar, Users } from "lucide-react";
import { wagerLeaderboardApi, ActiveRace, RaceHistoryEntry, RaceStandingRow, RaceType } from "@/lib/api/wagerLeaderboard";
import { formatLondon } from "@/lib/londonTime";
import { API_ENDPOINTS } from "@/lib/api";

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

function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (target === null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);
  return target === null ? 0 : Math.max(0, target - now);
}

function CountdownUnits({ ms }: { ms: number }) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
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
          <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{seg.label}</p>
        </div>
      ))}
    </div>
  );
}

function AvatarCircle({ row, size = 36 }: { row: { displayName: string; kickUsername: string | null; avatarUrl: string | null }; size?: number }) {
  const name = row.kickUsername ?? row.displayName;
  if (row.avatarUrl) {
    return <img src={row.avatarUrl} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />;
  }
  const colors = ["from-blue-500 to-blue-700", "from-yellow-500 to-yellow-700", "from-cyan-500 to-cyan-700", "from-indigo-500 to-indigo-700"];
  const initial = name.charAt(0) || "?";
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size }} className={`rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initial.toUpperCase()}
    </div>
  );
}

const PODIUM_STYLES: Record<number, { ring: string; badge: string; height: string; order: string }> = {
  1: { ring: "ring-2 ring-gold-400/60 shadow-gold-lg", badge: "bg-gold-400 text-navy-950", height: "pt-0", order: "order-2" },
  2: { ring: "ring-2 ring-gray-300/40", badge: "bg-gray-300 text-navy-950", height: "pt-6 sm:pt-10", order: "order-1" },
  3: { ring: "ring-2 ring-orange-400/40", badge: "bg-orange-400 text-navy-950", height: "pt-6 sm:pt-10", order: "order-3" },
};

function PodiumCard({ row }: { row: RaceStandingRow }) {
  const style = PODIUM_STYLES[row.position];
  const isFirst = row.position === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: row.position * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`${style.order} ${style.height} flex-1 min-w-0`}
    >
      <div className={`bg-navy-800/70 border border-white/8 rounded-2xl ${style.ring} p-4 sm:p-6 text-center backdrop-blur-sm relative overflow-hidden`}>
        {isFirst && <Crown className="w-6 h-6 text-gold-400 mx-auto mb-1" />}
        <div className={`mx-auto mb-3 flex items-center justify-center rounded-full ${style.badge} font-black shrink-0`} style={{ width: isFirst ? 32 : 26, height: isFirst ? 32 : 26 }}>
          {row.position}
        </div>
        <div className="flex justify-center mb-3">
          <AvatarCircle row={row} size={isFirst ? 76 : 56} />
        </div>
        <p className={`text-white font-bold truncate ${isFirst ? "text-base" : "text-sm"}`}>
          {maskUsername(row.kickUsername ?? row.displayName)}
        </p>
        <p className="text-gray-400 text-xs mt-1 font-semibold tabular-nums">{fmtMoney(row.wagered)}</p>
        {row.prizeAmount !== null && (
          <p className="text-gold-400 font-black text-lg mt-2">${row.prizeAmount}</p>
        )}
      </div>
    </motion.div>
  );
}

interface Props {
  // Which independent leaderboard this instance renders — Weekly and Monthly
  // races run concurrently, each with their own schedule and prizes.
  type: RaceType;
  // Fetched server-side in page.tsx before the page ever reaches the browser,
  // so the first paint (and what a crawler sees) already has real standings
  // instead of a spinner. `null`/absent means the server fetch didn't run or
  // failed — in that case this behaves exactly as it always has: start
  // loading, fetch client-side. The client fetch below still runs either way,
  // both to pick up anything that changed since the server render and to
  // drive the existing 30s refresh — this only removes the *first* spinner.
  initialData?: { race: ActiveRace | null; history: RaceHistoryEntry[] } | null;
}

export default function LeaderboardPage({ type, initialData = null }: Props) {
  const [race, setRace] = useState<ActiveRace | null>(initialData?.race ?? null);
  const [history, setHistory] = useState<RaceHistoryEntry[]>(initialData?.history ?? []);
  const [loading, setLoading] = useState(initialData === null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, h] = await Promise.all([wagerLeaderboardApi.getActive(type), wagerLeaderboardApi.getHistory(type)]);
        setRace(r);
        setHistory(h);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [type]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMyUserId(d.user?.id ?? null))
      .catch(() => {});
  }, []);

  const startMs = race ? new Date(race.startDate).getTime() : null;
  const endMs = race ? new Date(race.endDate).getTime() : null;
  const countdownTarget = race?.phase === "upcoming" ? startMs : race?.phase === "active" ? endMs : null;
  const remainingMs = useCountdown(countdownTarget);

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-12 pb-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  const top10 = race?.standings.filter((r) => r.position <= 10) ?? [];
  const podium = top10.filter((r) => r.position <= 3);
  const rest = top10.filter((r) => r.position > 3);
  const myRow = myUserId ? race?.standings.find((r) => r.userId === myUserId) : undefined;
  const showMyRankBanner = myRow && myRow.position > 3;
  const typeLabel = type === "WEEKLY" ? "Weekly" : "Monthly";

  return (
    <div className="pt-8 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Trophy className="w-3.5 h-3.5" />
            {typeLabel} Race
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-4 tracking-wide">
            {race ? (
              <>
                <span className="text-gold-400">${race.totalPrizePool}</span> {typeLabel.toUpperCase()} LEADERBOARD ON RAZED
              </>
            ) : (
              <>{typeLabel.toUpperCase()} <span className="text-gold-400">LEADERBOARD</span></>
            )}
          </h1>

          {race && (
            <>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
                {race.phase === "upcoming" ? "Starts In" : race.phase === "active" ? "Ends In" : "Leaderboard Finished"}
              </p>
              {race.phase !== "ended" ? (
                <CountdownUnits ms={remainingMs} />
              ) : (
                <p className="text-gray-400 text-sm">
                  This leaderboard has finished — check below for the winners. Standings can shift slightly for a
                  short while after this as the last day's wagers are confirmed.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-gold-400" /> ${race.totalPrizePool} prize pool</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gold-400" /> {race.prizes.length} paid position{race.prizes.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold-400" /> {formatLondon(race.startDate)} – {formatLondon(race.endDate)}</span>
              </div>
            </>
          )}
        </motion.div>

        {!race ? (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center mb-12">
            <Trophy className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No race is running right now</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon for the next one</p>
          </div>
        ) : race.standings.length === 0 ? (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center mb-12">
            <Trophy className="w-10 h-10 text-gold-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No wagers recorded yet this race</p>
            <p className="text-gray-400 text-sm mt-1">Wagers sync automatically from Razed — check back soon</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {podium.length > 0 && (
              <div className="flex items-end gap-3 sm:gap-4 mb-8">
                {podium.map((row) => <PodiumCard key={row.position} row={row} />)}
              </div>
            )}

            {/* Your rank, if outside top 3 */}
            {showMyRankBanner && myRow && (
              <div className="bg-gold-500/8 border border-gold-500/25 rounded-xl px-5 py-3 mb-4 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-navy-900/80 border border-white/8 text-gold-400 text-xs font-bold shrink-0">
                  {myRow.position}
                </span>
                <p className="text-gold-300 text-sm font-semibold">This is your current position</p>
              </div>
            )}

            {/* List, 4th+ */}
            {rest.length > 0 && (
              <div className="bg-navy-800/60 border border-white/6 rounded-2xl overflow-hidden mb-12 shadow-card max-h-[520px] overflow-y-auto">
                {rest.map((row, i) => (
                  <motion.div
                    key={row.position}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className={`flex items-center gap-3 px-5 py-3 border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors ${
                      row.userId && row.userId === myUserId ? "bg-gold-500/8" : ""
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-navy-900/80 border border-white/8 text-gray-400 text-xs font-bold shrink-0">
                      {row.position}
                    </span>
                    <AvatarCircle row={row} />
                    <span className="text-white font-medium text-sm truncate flex-1 min-w-0">{maskUsername(row.kickUsername ?? row.displayName)}</span>
                    <span className="text-gray-300 text-sm font-semibold tabular-nums shrink-0">{fmtMoney(row.wagered)}</span>
                    <span className="w-14 text-right shrink-0">
                      {row.prizeAmount !== null ? (
                        <span className="text-gold-400 font-bold text-sm">${row.prizeAmount}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Past winners */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45 mb-4 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" />
              Past Winners
            </p>
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="bg-navy-800/50 border border-white/6 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-semibold mb-3">
                    {formatLondon(entry.startDate, "d MMM")} – {formatLondon(entry.endDate, "d MMM yyyy")} · ${entry.totalPrizePool} pool
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.winners.map((w) => (
                      <div key={w.userId} className="flex items-center gap-2 bg-navy-900/60 border border-white/5 rounded-lg pl-1.5 pr-3 py-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-gold-400 text-navy-950">
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
