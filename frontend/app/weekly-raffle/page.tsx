"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gift, Users, Clock, CheckCircle2, XCircle, Trophy, Link2 } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { weeklyRaffleApi, WeeklyRaffle, WeeklyRaffleEligibility } from "@/lib/api/weeklyRaffle";
import { isoWeekNumber } from "@/lib/weekNumber";

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!target) return;
    const targetMs = new Date(target).getTime();
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-navy-900/60 border border-white/8 rounded-xl px-4 py-3 text-center min-w-[70px]">
      <p className="text-white font-black text-2xl tabular-nums">{String(value).padStart(2, "0")}</p>
      <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  );
}

export default function WeeklyRafflePage() {
  const [authed, setAuthed] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);

  const [raffle, setRaffle] = useState<WeeklyRaffle | null | undefined>(undefined);
  const [eligibility, setEligibility] = useState<WeeklyRaffleEligibility | null>(null);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [history, setHistory] = useState<WeeklyRaffle[]>([]);

  const remainingMs = useCountdown(raffle?.weekEnd ?? null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setCheckedAuth(true);
      return;
    }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.user))
      .catch(() => setAuthed(false))
      .finally(() => setCheckedAuth(true));
  }, []);

  const load = useCallback(async () => {
    try {
      const [current, hist] = await Promise.all([weeklyRaffleApi.getCurrent(), weeklyRaffleApi.getHistory(10)]);
      setRaffle(current);
      setHistory(hist);
    } catch {
      setRaffle(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!raffle) return;
    weeklyRaffleApi.getEligibleCount(raffle.id).then(setEligibleCount).catch(() => setEligibleCount(null));
    if (authed) {
      weeklyRaffleApi.getMyEligibility(raffle.id).then(setEligibility).catch(() => setEligibility(null));
    }
  }, [raffle?.id, authed]);

  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-block bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            No Purchase Needed
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            WEEKLY <span className="text-gold-400">RAFFLE</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Meet this week's wagering requirement under the Razed code and you're automatically entered — drawn live every Monday.
          </p>
        </motion.div>

        {raffle === undefined ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !raffle ? (
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-8 text-center mb-8">
            <Gift className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">No raffle is open for this week yet — check back soon.</p>
          </div>
        ) : (
          <>
            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6 text-center"
            >
              <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-gold-400" />
                {raffle.status === "OPEN" ? "Draw Countdown" : "This Week's Raffle Has Been Drawn"}
              </h2>
              {raffle.status === "OPEN" ? (
                <div className="flex justify-center gap-2 sm:gap-3">
                  <CountdownUnit value={days} label="Days" />
                  <CountdownUnit value={hours} label="Hrs" />
                  <CountdownUnit value={minutes} label="Min" />
                  <CountdownUnit value={seconds} label="Sec" />
                </div>
              ) : (
                raffle.winner && (
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="w-6 h-6 text-gold-400" />
                    <p className="text-white font-semibold">{raffle.winner.displayName} won this week!</p>
                  </div>
                )
              )}
            </motion.div>

            {/* Requirements + progress */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6"
            >
              <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <Gift className="w-4 h-4 text-gold-400" />
                Week {isoWeekNumber(raffle.weekStart)} Requirements
              </h2>
              <div className="space-y-2 mb-4">
                {raffle.requirements.map((r, i) => (
                  <p key={i} className="text-gray-400 text-sm">
                    • Wager at least <span className="text-white font-semibold">${r.value.toLocaleString()}</span> under
                    the Razed code this week
                  </p>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <Users className="w-4 h-4" />
                {eligibleCount === null ? "Loading…" : `${eligibleCount} eligible participant${eligibleCount === 1 ? "" : "s"}`}
              </div>

              {!checkedAuth ? null : !authed ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-lg px-4 py-3 hover:border-purple-500/45 transition-colors"
                >
                  <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-purple-300 text-sm font-semibold">
                    Log in and connect your Razed account to check your eligibility →
                  </span>
                </Link>
              ) : eligibility ? (
                <div
                  className={`rounded-lg px-4 py-3 border ${
                    eligibility.eligible
                      ? "bg-green-500/8 border-green-500/25"
                      : "bg-red-500/8 border-red-500/25"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {eligibility.eligible ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <p className={`text-sm font-semibold ${eligibility.eligible ? "text-green-300" : "text-red-300"}`}>
                      {eligibility.eligible ? "You're entered this week!" : "Not eligible yet"}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">
                    Your wager this week:{" "}
                    <span className="text-white font-semibold">${eligibility.wagered.toLocaleString()}</span>
                  </p>
                  {!eligibility.eligible && (
                    <ul className="text-gray-400 text-xs list-disc list-inside space-y-0.5 mt-1">
                      {eligibility.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </motion.div>
          </>
        )}

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6"
        >
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-400" />
            Previous Winners
          </h2>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">No completed raffles yet — check back after the first Monday draw.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between bg-navy-900/60 border border-white/5 rounded-lg px-4 py-3"
                >
                  <span className="text-gray-400 text-sm">Week {isoWeekNumber(h.weekStart)}</span>
                  <span className="text-white font-semibold text-sm">{h.winner?.displayName ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
