"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { highRollerApi, HighRollerSession, HighRollerPlayer, HighRollerRoundResult, HighRollerHallOfFame } from "@/lib/api/highRoller";
import { getSocket } from "@/lib/socket";

function uname(p: HighRollerPlayer) {
  return p.user.kickUsername ?? p.user.displayName;
}

function fmtMulti(v: string | number) {
  return `${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function Avatar({ p, size }: { p: HighRollerPlayer; size: number }) {
  const n = uname(p);
  if (p.user.avatarUrl) {
    return (
      <img
        src={p.user.avatarUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "rgba(255,255,255,0.12)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: size * 0.42,
    }}>
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

const W = 280;
const MAX_ROWS = 5;

export default function HighRollerWidget() {
  const [session, setSession] = useState<HighRollerSession | null>(null);
  const [reveal, setReveal] = useState<HighRollerRoundResult | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [champion, setChampion] = useState<HighRollerHallOfFame | null>(null);
  const [drawText, setDrawText] = useState<{ current: string; settled: boolean } | null>(null);
  const prevIdRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const drawTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Force transparent background for OBS
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = "html,body{background:transparent!important;margin:0;padding:0}";
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await highRollerApi.getActive();
      setSession(data ?? null);
    } catch { /* ignore */ }
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
      setSession(updated.status === "OPEN" ? updated : null);
    };

    const onRoundResult = (data: HighRollerRoundResult & { sessionId: string }) => {
      if (data.sessionId !== session.id) return;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setReveal(data);
      timersRef.current.push(setTimeout(() => setReveal(null), 3200));

      if (data.milestonesHit.length > 0) {
        const m = data.milestonesHit[0];
        timersRef.current.push(setTimeout(() => {
          setFlash(`🔥 ${m.kickUsername} — ${m.streak} STREAK!`);
          timersRef.current.push(setTimeout(() => setFlash(null), 2400));
        }, 3300));
      }
    };

    const onGameEnded = (data: { sessionId: string; hallOfFame: HighRollerHallOfFame }) => {
      if (data.sessionId !== session.id) return;
      setChampion(data.hallOfFame);
      timersRef.current.push(setTimeout(() => setChampion(null), 8000));
    };

    const onSuggestionDraw = (data: { sessionId: string; winner: { kickUsername: string } }) => {
      if (data.sessionId !== session.id) return;
      drawTimersRef.current.forEach(clearTimeout);
      drawTimersRef.current = [];

      const candidates = session.players.filter((p) => p.active).map((p) => uname(p));
      if (candidates.length === 0) {
        setDrawText({ current: data.winner.kickUsername, settled: true });
        drawTimersRef.current.push(setTimeout(() => setDrawText(null), 2200));
        return;
      }
      let i = 0;
      let delay = 65;
      let elapsed = 0;
      setDrawText({ current: candidates[0], settled: false });
      const step = () => {
        i = (i + 1) % candidates.length;
        setDrawText({ current: candidates[i], settled: false });
        elapsed += delay;
        delay = Math.min(delay * 1.18, 220);
        if (elapsed < 1300) {
          drawTimersRef.current.push(setTimeout(step, delay));
        } else {
          setDrawText({ current: data.winner.kickUsername, settled: true });
          drawTimersRef.current.push(setTimeout(() => setDrawText(null), 2200));
        }
      };
      drawTimersRef.current.push(setTimeout(step, delay));
    };

    socket.on("highroller:updated", onUpdate);
    socket.on("highroller:round-result", onRoundResult);
    socket.on("highroller:game-ended", onGameEnded);
    socket.on("highroller:suggestion-draw", onSuggestionDraw);
    return () => {
      socket.off("highroller:updated", onUpdate);
      socket.off("highroller:round-result", onRoundResult);
      socket.off("highroller:game-ended", onGameEnded);
      socket.off("highroller:suggestion-draw", onSuggestionDraw);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      drawTimersRef.current.forEach(clearTimeout);
      drawTimersRef.current = [];
    };
  }, [session?.id]);

  // ── Champion celebration — shown even after the session has closed ───────
  if (champion) {
    return (
      <div style={{ padding: 6, width: W, fontFamily: "system-ui,sans-serif" }}>
        <div style={{
          background: "linear-gradient(180deg, rgba(127,29,29,0.55), rgba(0,0,0,0.8))",
          border: "1px solid rgba(245,158,11,0.4)",
          borderRadius: 14, padding: "18px 12px",
          textAlign: "center",
          boxShadow: "0 0 28px rgba(245,158,11,0.2)",
        }}>
          <div style={{ fontSize: 26 }}>🏆</div>
          <div style={{ color: "#fbbf24", fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
            High Roller Champion
          </div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 16, marginTop: 4 }}>
            {champion.champions.map((c) => c.kickUsername).join(" & ") || "—"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 3 }}>
            🔥 Longest Streak: {champion.longestStreak}
          </div>
        </div>
      </div>
    );
  }

  // ── No active session ──────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ padding: 6, width: W, fontFamily: "system-ui,sans-serif" }}>
        <div style={{
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "16px 10px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 24, marginBottom: 5 }}>🎲</div>
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
            No Active High Roller
          </div>
        </div>
      </div>
    );
  }

  const top = session.players.filter((p) => p.active).slice(0, MAX_ROWS);

  return (
    <div style={{ padding: 6, width: W, fontFamily: "system-ui,sans-serif", userSelect: "none" }}>
      <div style={{
        background: "rgba(0,0,0,0.72)",
        border: "1px solid rgba(239,68,68,0.28)",
        borderRadius: 14, overflow: "hidden",
        boxShadow: "0 0 28px rgba(239,68,68,0.12)",
      }}>
        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 14 }}>🎲</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.title || "High Roller"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{
              color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700,
              background: "rgba(255,255,255,0.07)", borderRadius: 5, padding: "1px 5px",
            }}>
              {session.players.filter((p) => p.active).length}
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: session.paused ? "#facc15" : "#4ade80",
              boxShadow: session.paused ? "0 0 6px #facc15" : "0 0 6px #4ade80",
              animation: "hrBlink 1.4s ease-in-out infinite",
            }} />
          </div>
        </div>

        {/* Current line — replaced briefly by the suggestion-draw or round-result flash */}
        {drawText ? (
          <div style={{ textAlign: "center", padding: "14px 12px 10px", animation: "hrPop 0.3s ease-out" }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>
              {drawText.settled ? "🎉 Slot Suggestion Winner" : "Choosing…"}
            </div>
            <div style={{ color: drawText.settled ? "#fbbf24" : "#fff", fontWeight: 900, fontSize: 18, marginTop: 4 }}>
              {drawText.current}
            </div>
          </div>
        ) : reveal ? (
          <div style={{
            textAlign: "center", padding: "14px 12px 10px",
            animation: "hrPop 0.3s ease-out",
          }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Round {reveal.roundNumber}
            </div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, textShadow: "0 0 14px rgba(245,158,11,0.4)" }}>
              {fmtMulti(reveal.slotResult)}
            </div>
            <div style={{
              color: reveal.winningSide === "OVER" ? "#f87171" : "rgba(255,255,255,0.85)",
              fontWeight: 900, fontSize: 17, marginTop: 2, letterSpacing: 0.5,
            }}>
              {reveal.winningSide} WINS!
            </div>
            {reveal.perfectRound && (
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 9.5, marginTop: 3 }}>✨ PERFECT ROUND</div>
            )}
            {reveal.houseWins && (
              <div style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 9.5, marginTop: 3 }}>💀 HOUSE WINS</div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "14px 12px 10px" }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>
              {session.finalRound ? "⚠️ Final Round" : "Over / Under"}
            </div>
            <div style={{ color: "#fbbf24", fontWeight: 900, fontSize: 26, textShadow: "0 0 14px rgba(245,158,11,0.4)" }}>
              {fmtMulti(session.threshold)}
            </div>
            <div style={{ color: session.roundLocked ? "#f87171" : "rgba(255,255,255,0.4)", fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>
              {session.roundLocked ? "🔒 LOCKED" : "PREDICTIONS OPEN"}
            </div>
          </div>
        )}

        {/* Milestone flash */}
        {flash && (
          <div style={{
            margin: "0 10px 8px", padding: "5px 8px", borderRadius: 8,
            background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)",
            textAlign: "center", color: "#fbbf24", fontWeight: 800, fontSize: 10.5,
            animation: "hrPop 0.3s ease-out",
          }}>
            {flash}
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ padding: "0 10px 10px" }}>
          {top.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, textAlign: "center", padding: "8px 0" }}>
              Waiting for players…
            </div>
          ) : (
            top.map((p, i) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "5px 6px", borderRadius: 8,
                background: i === 0 && p.currentStreak > 0 ? "rgba(239,68,68,0.1)" : "transparent",
                marginBottom: 2,
              }}>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9.5, width: 12, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                <Avatar p={p} size={20} />
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 10.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uname(p)}
                </span>
                <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                  🔥{p.currentStreak}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "6px 12px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Type {session.joinKeyword} in chat to play
          </span>
        </div>
      </div>

      <style>{`
        @keyframes hrBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes hrPop {
          0%   { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
