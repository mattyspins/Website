"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Flame, Crown, Sparkles, Volume2, VolumeX, Swords, Trophy } from "lucide-react";
import { highRollerApi, HighRollerSession, HighRollerPlayer, HighRollerRoundResult, HighRollerHallOfFame } from "@/lib/api/highRoller";
import { getSocket } from "@/lib/socket";
import { useHighRollerSound } from "@/lib/highRollerSound";
import Confetti from "@/components/highRoller/Confetti";

function uname(p: HighRollerPlayer) {
  return p.user.kickUsername ?? p.user.displayName;
}

function fmtMulti(v: string | number) {
  return `${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function Avatar({ p, size }: { p: HighRollerPlayer; size: number }) {
  const n = uname(p);
  if (p.user.avatarUrl) {
    return <img src={p.user.avatarUrl} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// Small ephemeral notifications (new player, milestone, streak leader) — stack in a
// corner and auto-dismiss, independent of the big round-reveal overlay below.
type Toast = { id: string; icon: string; title: string; subtitle?: string; accent: string };

// A short count-up used for the round-reveal multiplier, driven by a plain rAF loop
// rather than framer-motion's imperative API — easier to reason about alongside the
// staged reveal sequence (counting → result banner) it feeds into.
function useCountUp(target: number | null, durationMs = 850) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) { setValue(0); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

// Rapidly cycles through candidate names, gradually slowing down, then settles on
// the real winner — the suspense beat for "Draw Slot Suggestion".
function SuggestionDrawOverlay({ candidates, winner, onDone }: { candidates: string[]; winner: string; onDone: () => void }) {
  const [current, setCurrent] = useState(candidates[0] ?? winner);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (candidates.length === 0) {
      setCurrent(winner);
      setSettled(true);
      const t = setTimeout(onDone, 2400);
      return () => clearTimeout(t);
    }

    let i = 0;
    let delay = 60;
    let elapsed = 0;
    const totalCycleMs = 1500;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      i = (i + 1) % candidates.length;
      setCurrent(candidates[i]);
      elapsed += delay;
      delay = Math.min(delay * 1.18, 240);
      if (elapsed < totalCycleMs) {
        timer = setTimeout(step, delay);
      } else {
        setCurrent(winner);
        setSettled(true);
        timer = setTimeout(onDone, 2400);
      }
    };
    timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, winner]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
    >
      <div className="text-center">
        <p className="text-white/40 text-sm font-bold uppercase tracking-[0.3em] mb-4">
          {settled ? "🎉 Slot Suggestion Winner" : "Choosing…"}
        </p>
        <p className={`font-black text-4xl sm:text-5xl ${settled ? "text-gold-400" : "text-white"}`}>{current}</p>
        {settled && <p className="text-white/50 mt-4">Choose the next slot! 🎰</p>}
      </div>
    </motion.div>
  );
}

export default function HighRollerPage() {
  const [session, setSession] = useState<HighRollerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const prevIdRef = useRef<string | null>(null);
  const prevLockedRef = useRef<boolean | null>(null);
  const prevFinalRoundRef = useRef<boolean>(false);
  const prevTiedRef = useRef<string | null>(null);
  const revealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { muted, toggleMute, play } = useHighRollerSound();

  const [champion, setChampion] = useState<HighRollerHallOfFame | null>(null);
  const [battle, setBattle] = useState<HighRollerPlayer[] | null>(null);
  const [finalRoundAnnounce, setFinalRoundAnnounce] = useState(false);
  const [suggestionDraw, setSuggestionDraw] = useState<{ candidates: string[]; winner: string } | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...t, id }].slice(-4));
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const [reveal, setReveal] = useState<{ data: HighRollerRoundResult; stage: "counting" | "result" } | null>(null);
  const displayMultiplier = useCountUp(reveal?.stage === "counting" ? reveal.data.slotResult : null);

  const load = useCallback(async () => {
    try {
      const data = await highRollerApi.getActive();
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
      socket.emit("leaveHighRoller", prevIdRef.current);
    }
    if (!session?.id) return;
    socket.emit("joinHighRoller", session.id);
    prevIdRef.current = session.id;

    const onUpdate = (updated: HighRollerSession) => {
      if (updated.id !== session.id) return;
      if (prevLockedRef.current === false && updated.roundLocked) {
        play("lock");
      }
      prevLockedRef.current = updated.roundLocked;

      if (!prevFinalRoundRef.current && updated.finalRound) {
        setFinalRoundAnnounce(true);
        setTimeout(() => setFinalRoundAnnounce(false), 3800);
      }
      prevFinalRoundRef.current = updated.finalRound;

      // Streak battle: two or more active players newly tied for the lead.
      const active = updated.players.filter((p) => p.active);
      const maxStreak = Math.max(0, ...active.map((p) => p.currentStreak));
      const leaders = active.filter((p) => p.currentStreak === maxStreak && maxStreak > 0);
      const tieSignature = leaders.length >= 2 ? `${maxStreak}:${leaders.map((p) => p.id).sort().join(",")}` : null;
      if (tieSignature && tieSignature !== prevTiedRef.current) {
        setBattle(leaders.slice(0, 2));
        setTimeout(() => setBattle(null), 3200);
      }
      prevTiedRef.current = tieSignature;

      setSession(updated.status === "OPEN" ? updated : null);
    };

    const onRoundResult = (data: HighRollerRoundResult & { sessionId: string }) => {
      if (data.sessionId !== session.id) return;

      // A new round result arriving mid-sequence (admin resolved twice in quick
      // succession) shouldn't let the previous sequence's timers clobber this one.
      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];

      setReveal({ data, stage: "counting" });
      revealTimersRef.current.push(setTimeout(() => {
        setReveal((r) => (r ? { ...r, stage: "result" } : r));
        if (data.houseWins) play("house");
        else if (data.perfectRound) play("perfect");
        else play("correct");

        data.milestonesHit.forEach((m, i) => {
          revealTimersRef.current.push(setTimeout(() => {
            play("milestone");
            pushToast({ icon: "🔥", title: `${m.kickUsername} hit a ${m.streak}-streak!`, accent: "border-gold-500/40 bg-gold-500/10" });
          }, 350 + i * 500));
        });
        if (data.newStreakLeader) {
          revealTimersRef.current.push(setTimeout(() => {
            play("leader");
            pushToast({ icon: "👑", title: `${data.newStreakLeader!.kickUsername} takes the lead!`, subtitle: `${data.newStreakLeader!.streakAfter} streak`, accent: "border-red-500/40 bg-red-500/10" });
          }, 350 + data.milestonesHit.length * 500 + 200));
        }
      }, 900));
      revealTimersRef.current.push(setTimeout(() => setReveal(null), 3600));
    };

    const onPlayerJoined = (data: { sessionId: string; kickUsername: string }) => {
      if (data.sessionId !== session.id) return;
      play("join");
      pushToast({ icon: "🆕", title: `${data.kickUsername} joined!`, accent: "border-white/15 bg-white/5" });
    };

    const onGameEnded = (data: { sessionId: string; hallOfFame: HighRollerHallOfFame }) => {
      if (data.sessionId !== session.id) return;
      play("perfect");
      setChampion(data.hallOfFame);
    };

    const onSuggestionDraw = (data: { sessionId: string; winner: { kickUsername: string } }) => {
      if (data.sessionId !== session.id) return;
      const candidates = session.players.filter((p) => p.active).map((p) => uname(p));
      setSuggestionDraw({ candidates, winner: data.winner.kickUsername });
    };

    socket.on("highroller:updated", onUpdate);
    socket.on("highroller:round-result", onRoundResult);
    socket.on("highroller:player-joined", onPlayerJoined);
    socket.on("highroller:game-ended", onGameEnded);
    socket.on("highroller:suggestion-draw", onSuggestionDraw);
    return () => {
      socket.off("highroller:updated", onUpdate);
      socket.off("highroller:round-result", onRoundResult);
      socket.off("highroller:player-joined", onPlayerJoined);
      socket.off("highroller:game-ended", onGameEnded);
      socket.off("highroller:suggestion-draw", onSuggestionDraw);
      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];
    };
  }, [session?.id, play, pushToast]);

  const players = session?.players.filter((p) => p.active) ?? [];
  const recentRounds = [...(session?.rounds ?? [])].sort((a, b) => b.roundNumber - a.roundNumber).slice(0, 8);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400" />
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
          className="text-center mb-10 relative"
        >
          <button
            onClick={toggleMute}
            className="absolute right-0 top-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
            title={muted ? "Unmute sound effects" : "Mute sound effects"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            <Dices className="w-3.5 h-3.5" />
            Stream Game
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            HIGH <span className="text-red-400">ROLLER</span>
          </h1>
          {session ? (
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Type <code className="bg-white/10 text-red-300 px-1.5 py-0.5 rounded font-mono">{session.joinKeyword}</code> to play.
              Each round, predict <code className="bg-white/10 text-red-300 px-1.5 py-0.5 rounded font-mono">{session.overKeyword}</code> or{" "}
              <code className="bg-white/10 text-red-300 px-1.5 py-0.5 rounded font-mono">{session.underKeyword}</code> the line before it locks — build the longest streak.
            </p>
          ) : (
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Predict Over/Under a multiplier line every round and build the longest correct-guess streak. No elimination — a wrong guess only resets your streak.
            </p>
          )}
        </motion.div>

        {!session ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-navy-800/60 border border-white/6 rounded-2xl p-12 text-center"
          >
            <Dices className="w-10 h-10 text-red-400/40 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No High Roller game live right now</p>
            <p className="text-gray-600 text-sm mt-1">Check back during the next stream 👊</p>
          </motion.div>
        ) : (
          <div className="space-y-6">

            {/* Live badge */}
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${session.paused ? "bg-yellow-400" : "bg-green-400 animate-pulse"}`} />
              <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                {session.paused ? "Paused" : "Live"} · {players.length} {players.length === 1 ? "player" : "players"} · Round {session.roundNumber + 1}
              </span>
            </div>

            {/* Current line */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-b from-red-500/10 to-navy-800/60 border border-red-500/25 rounded-2xl p-8 text-center"
            >
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
                {session.finalRound ? "⚠️ Final Round — " : ""}Over / Under
              </p>
              <p className="text-gold-400 text-5xl font-black">{fmtMulti(session.threshold)}</p>
              <p className="text-gray-500 text-sm mt-3">
                {session.roundLocked ? "🔒 Predictions locked — spin incoming" : "Predictions open"}
              </p>
            </motion.div>

            {/* Leaderboard */}
            <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Leaderboard</p>
              {players.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No one's joined yet — be the first!</p>
              ) : (
                <motion.div layout className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {players.map((p, i) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                          i === 0 && p.currentStreak > 0 ? "bg-red-500/8 border-red-500/20" : "bg-white/3 border-white/5"
                        }`}
                      >
                        <span className="text-gray-600 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                        <Avatar p={p} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-200 text-sm font-medium truncate flex items-center gap-1.5">
                            {i === 0 && p.currentStreak > 0 && <Crown className="w-3.5 h-3.5 text-gold-400 shrink-0" />}
                            {uname(p)}
                          </p>
                          <p className="text-gray-600 text-xs truncate">{p.roundsPlayed} rounds · {p.accuracy}% accuracy</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="flex items-center gap-1 text-gold-400 font-black text-sm">
                            <Flame className="w-3.5 h-3.5" /> {p.currentStreak}
                          </span>
                          <p className="text-gray-600 text-[11px]">best {p.bestStreak}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Recent rounds */}
            {recentRounds.length > 0 && (
              <div className="bg-navy-800/60 border border-white/6 rounded-2xl p-6">
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Recent Rounds</p>
                <div className="flex flex-wrap gap-2">
                  {recentRounds.map((r) => (
                    <div
                      key={r.id}
                      className={`px-3 py-2 rounded-lg border text-xs ${
                        r.winningSide === "OVER" ? "bg-red-500/10 border-red-500/25 text-red-300" : "bg-white/5 border-white/10 text-gray-300"
                      }`}
                    >
                      <span className="font-bold">#{r.roundNumber}</span> {fmtMulti(r.slotResult)} · {r.winningSide}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast stack */}
      <div className="fixed top-24 right-4 z-40 flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg ${t.accent}`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{t.title}</p>
                {t.subtitle && <p className="text-white/50 text-xs leading-tight">{t.subtitle}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Round reveal overlay */}
      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {reveal.stage === "counting" ? (
                <>
                  <p className="text-white/40 text-sm font-bold uppercase tracking-[0.3em] mb-4">Spin Complete…</p>
                  <p className="text-white font-black text-6xl sm:text-7xl tabular-nums">{fmtMulti(displayMultiplier)}</p>
                </>
              ) : (
                <>
                  <p className="text-white/40 text-sm font-bold uppercase tracking-[0.3em] mb-2">Round {reveal.data.roundNumber}</p>
                  <p className="text-white font-black text-5xl sm:text-6xl tabular-nums mb-4">{fmtMulti(reveal.data.slotResult)}</p>
                  <p className={`font-black text-4xl sm:text-5xl tracking-wide ${reveal.data.winningSide === "OVER" ? "text-red-400" : "text-gray-200"}`}>
                    {reveal.data.winningSide} WINS!
                  </p>
                  {reveal.data.perfectRound && (
                    <p className="flex items-center justify-center gap-2 text-gold-400 font-bold text-lg mt-5">
                      <Sparkles className="w-5 h-5" /> PERFECT ROUND — everyone predicted correctly!
                    </p>
                  )}
                  {reveal.data.houseWins && (
                    <p className="text-white/50 font-bold text-lg mt-5">💀 HOUSE WINS — nobody got it right</p>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final round countdown */}
      <AnimatePresence>
        {finalRoundAnnounce && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/85 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-red-400 font-black text-5xl sm:text-6xl tracking-[0.15em]">⚠️ FINAL ROUND</p>
              <p className="text-white/70 text-lg mt-4">Everything comes down to this!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak battle overlay */}
      <AnimatePresence>
        {battle && battle.length >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <p className="flex items-center justify-center gap-2 text-red-400 font-black text-2xl sm:text-3xl tracking-widest uppercase mb-6">
                <Swords className="w-7 h-7" /> Streak Battle
              </p>
              <div className="flex items-center justify-center gap-6 sm:gap-10">
                <div>
                  <Avatar p={battle[0]} size={64} />
                  <p className="text-white font-bold mt-2">{uname(battle[0])}</p>
                  <p className="text-gold-400 text-sm font-black">🔥 {battle[0].currentStreak}</p>
                </div>
                <p className="text-white/30 font-black text-2xl">VS</p>
                <div>
                  <Avatar p={battle[1]} size={64} />
                  <p className="text-white font-bold mt-2">{uname(battle[1])}</p>
                  <p className="text-gold-400 text-sm font-black">🔥 {battle[1].currentStreak}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot suggestion draw — cycling reveal */}
      <AnimatePresence>
        {suggestionDraw && (
          <SuggestionDrawOverlay
            candidates={suggestionDraw.candidates}
            winner={suggestionDraw.winner}
            onDone={() => setSuggestionDraw(null)}
          />
        )}
      </AnimatePresence>

      {/* Champion celebration */}
      <AnimatePresence>
        {champion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChampion(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-4 py-10 overflow-y-auto cursor-pointer"
          >
            <Confetti />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="relative text-center max-w-lg w-full cursor-default"
            >
              <Trophy className="w-14 h-14 text-gold-400 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
              <p className="text-gold-400 text-xs font-black uppercase tracking-[0.3em]">High Roller</p>
              <h2 className="text-white font-black text-4xl sm:text-5xl tracking-wide mt-1">CHAMPION</h2>
              {champion.champions.length > 0 && (
                <p className="text-red-400 font-black text-2xl sm:text-3xl mt-4">
                  {champion.champions.map((c) => c.kickUsername).join(" & ")}
                </p>
              )}
              <p className="text-white/50 text-sm mt-2">🔥 Longest Streak: {champion.longestStreak}</p>

              <div className="grid grid-cols-2 gap-3 mt-8 text-sm">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs uppercase tracking-wide">Most Accurate</p>
                  <p className="text-white font-semibold truncate">
                    {champion.mostAccurate.length > 0 ? `${champion.mostAccurate[0].kickUsername} (${champion.mostAccurate[0].accuracy}%)` : "—"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs uppercase tracking-wide">Most Correct</p>
                  <p className="text-white font-semibold truncate">
                    {champion.mostCorrectPredictions.length > 0 ? `${champion.mostCorrectPredictions[0].kickUsername} (${champion.mostCorrectPredictions[0].correctCount})` : "—"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs uppercase tracking-wide">Rounds Played</p>
                  <p className="text-white font-semibold">{champion.totalRoundsPlayed}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/40 text-xs uppercase tracking-wide">Biggest Comeback</p>
                  <p className="text-white font-semibold truncate">
                    {champion.biggestComeback ? `${champion.biggestComeback.kickUsername} (${champion.biggestComeback.streak})` : "—"}
                  </p>
                </div>
              </div>

              {champion.mvp && (
                <p className="text-white/40 text-xs mt-6">⭐ MVP: <span className="text-white font-semibold">{champion.mvp.kickUsername}</span></p>
              )}
              <p className="text-white/25 text-xs mt-6">Click anywhere to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
