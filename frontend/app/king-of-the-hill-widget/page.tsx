"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

function Avatar({ u, size, ring }: { u: KothUser | null | undefined; size: number; ring?: string }) {
  const n = uname(u);
  const inner = u?.avatarUrl ? (
    <img
      src={u.avatarUrl}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "rgba(255,255,255,0.12)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: size * 0.42,
    }}>
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
  if (!ring) return inner;
  return (
    <div style={{ padding: 2, borderRadius: "50%", background: ring, boxShadow: `0 0 14px ${ring}` }}>
      {inner}
    </div>
  );
}

const W = 300;
const HILL_TOP = 34;
const HILL_BASE = 210;
const APEX_X = W / 2;
const BASE_RIGHT_X = W - 34;
const MAX_CLIMBERS = 5;

export default function KingOfTheHillWidget() {
  const [session, setSession] = useState<KothSession | null>(null);
  const prevIdRef = useRef<string | null>(null);

  // Force transparent background for OBS
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = "html,body{background:transparent!important;margin:0;padding:0}";
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await kothApi.getActive();
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
          <div style={{ fontSize: 24, marginBottom: 5 }}>👑</div>
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
            No Active King of the Hill
          </div>
        </div>
      </div>
    );
  }

  const entries = session.entries;
  const kingEntry = entries.find((e) => e.status === "KING") ?? null;
  const kingRound = session.rounds.find((r) => r.isKing) ?? null;
  const drawnEntry = entries.find((e) => e.status === "DRAWN") ?? null;
  const drawnRound = drawnEntry
    ? session.rounds.find((r) => r.entryId === drawnEntry.id && !r.playedAt) ?? null
    : null;

  const climbers: KothRound[] = session.rounds
    .filter((r) => r.playedAt && !r.isKing)
    .sort((a, b) => Number(b.multiplier) - Number(a.multiplier))
    .slice(0, MAX_CLIMBERS);

  return (
    <div style={{ padding: 6, width: W, fontFamily: "system-ui,sans-serif", userSelect: "none" }}>
      <div style={{
        background: "rgba(0,0,0,0.72)",
        border: "1px solid rgba(245,158,11,0.28)",
        borderRadius: 14, overflow: "hidden",
        boxShadow: "0 0 28px rgba(245,158,11,0.12)",
      }}>
        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 14 }}>👑</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.label || "King of the Hill"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{
              color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700,
              background: "rgba(255,255,255,0.07)", borderRadius: 5, padding: "1px 5px",
            }}>
              {entries.length}
            </span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "kothBlink 1.4s ease-in-out infinite" }} />
          </div>
        </div>

        {/* Hill */}
        <div style={{ position: "relative", width: W, height: HILL_BASE + 12 }}>
          <svg width={W} height={HILL_BASE + 12} style={{ position: "absolute", top: 0, left: 0 }}>
            <defs>
              <linearGradient id="kothHill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(120,90,20,0.55)" />
                <stop offset="100%" stopColor="rgba(30,20,10,0.15)" />
              </linearGradient>
            </defs>
            <polygon
              points={`24,${HILL_BASE} ${APEX_X},${HILL_TOP} ${W - 24},${HILL_BASE}`}
              fill="url(#kothHill)"
              stroke="rgba(245,158,11,0.35)"
              strokeWidth={1.5}
            />
          </svg>

          {/* King at the peak */}
          <div style={{ position: "absolute", left: APEX_X, top: HILL_TOP - 30, transform: "translateX(-50%)", textAlign: "center", width: 120 }}>
            {kingEntry && kingRound ? (
              <>
                <div style={{ fontSize: 15, marginBottom: 1 }}>👑</div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Avatar u={kingEntry.user} size={38} ring="#fbbf24" />
                </div>
                <div style={{ color: "#fcd34d", fontWeight: 800, fontSize: 11.5, marginTop: 3, textShadow: "0 0 10px rgba(245,158,11,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uname(kingEntry.user)}
                </div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>{fmtMulti(kingRound.multiplier)}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 20, opacity: 0.3 }}>👑</div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>
                  Throne Empty
                </div>
              </>
            )}
          </div>

          {/* Climbers on the slope */}
          {climbers.map((r, i) => {
            const t = (i + 1) / (MAX_CLIMBERS + 1);
            const x = APEX_X + t * (BASE_RIGHT_X - APEX_X);
            const y = HILL_TOP + t * (HILL_BASE - HILL_TOP) - 14;
            return (
              <div key={r.id} style={{ position: "absolute", left: x, top: y, transform: "translateX(-50%)", textAlign: "center" }}>
                <Avatar u={r.user} size={22} />
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 8.5, fontWeight: 700, marginTop: 1 }}>
                  {fmtMulti(r.multiplier)}
                </div>
              </div>
            );
          })}

          {/* Currently climbing indicator at the base */}
          {drawnEntry && (
            <div style={{
              position: "absolute", left: APEX_X, top: HILL_BASE - 8, transform: "translateX(-50%)",
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(0,0,0,0.6)", border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: 20, padding: "4px 10px 4px 4px",
              animation: "kothPulse 1.6s ease-in-out infinite",
            }}>
              <Avatar u={drawnEntry.user} size={20} />
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 10.5, lineHeight: 1.1 }}>{uname(drawnEntry.user)}</div>
                <div style={{ color: "#fbbf24", fontSize: 8.5, fontWeight: 600, lineHeight: 1.1 }}>
                  {drawnRound?.slotName ? `🎰 Playing ${drawnRound.slotName}` : "🎯 Give your slot call!"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "6px 12px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Type !king in chat to join
          </span>
        </div>
      </div>

      <style>{`
        @keyframes kothBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        @keyframes kothPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(245,158,11,0.35); }
          50%      { box-shadow: 0 0 12px rgba(245,158,11,0.5); }
        }
      `}</style>
    </div>
  );
}
