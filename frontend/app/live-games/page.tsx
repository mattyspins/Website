"use client";

import { useEffect, useRef, useState } from "react";
import { IBM_Plex_Mono, Barlow_Condensed } from "next/font/google";
import { getSocket } from "@/lib/socket";
import { liftApi, LiftSession } from "@/lib/api/lift";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"] });

interface OverlayPos { letter?: string; name?: string; x: number; y: number }

const LOBBY_PHASES = new Set(["JOIN", "READY", "ROUND_LOBBY"]);

function timeLeftStr(phaseEndsAt: string | null): string {
  if (!phaseEndsAt) return "--";
  const secs = Math.max(0, Math.ceil((new Date(phaseEndsAt).getTime() - Date.now()) / 1000));
  return String(secs).padStart(2, "0");
}

export default function LiveGamesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const [session, setSession] = useState<LiftSession | null>(null);
  const [overlay, setOverlay] = useState<{ elevators: OverlayPos[]; avatars: OverlayPos[] }>({ elevators: [], avatars: [] });
  const [, forceTick] = useState(0);

  // Mount the three.js engine once.
  useEffect(() => {
    let cancelled = false;
    import("./lift-engine.js").then((mod) => {
      if (cancelled || !containerRef.current) return;
      engineRef.current = new mod.LiftGame(containerRef.current, {
        onUpdate: (o: { elevators: OverlayPos[]; avatars: OverlayPos[] }) => setOverlay(o),
      });
    });
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Feed every session update into the engine as it arrives.
  useEffect(() => {
    if (session) engineRef.current?.applySnapshot(session);
  }, [session]);

  // Initial fetch + socket subscription.
  useEffect(() => {
    let joinedId: string | null = null;
    const socket = getSocket();

    const onUpdate = (s: LiftSession) => {
      setSession(s);
      if (s.id !== joinedId) {
        if (joinedId) socket.emit("leaveLift", joinedId);
        socket.emit("joinLift", s.id);
        joinedId = s.id;
      }
    };

    liftApi.getActive().then((s) => { if (s) onUpdate(s); }).catch(() => {});
    socket.on("lift:updated", onUpdate);

    return () => {
      socket.off("lift:updated", onUpdate);
      if (joinedId) socket.emit("leaveLift", joinedId);
    };
  }, []);

  // Local countdown ticker (server only pushes on state changes, not every second).
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  const showList = session ? LOBBY_PHASES.has(session.status) && (session.status === "JOIN" || session.status === "READY") : false;
  const isSync = session?.roundType === "SYNC" && session.status === "ROUND_DECISION";

  return (
    <div className={`${mono.className} fixed inset-0 bg-[#0a0c0e] text-[#dbe4ee] overflow-hidden select-none`}>
      <style>{`
        @keyframes lift-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div ref={containerRef} className="absolute inset-0" />

      {!session && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`${condensed.className} text-2xl tracking-[0.12em] text-[#eef3f8]`}>NO LIVE GAME</div>
            <div className="text-xs tracking-[0.16em] text-[#5f6f7f] mt-2">WAITING FOR THE NEXT LIFT SESSION</div>
          </div>
        </div>
      )}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-6 pointer-events-none">
        <div className="flex flex-col gap-0.5">
          <div className={`${condensed.className} font-bold text-2xl tracking-[0.12em] text-[#eef3f8]`}>LIFT</div>
          <div className="text-[10px] tracking-[0.18em] text-[#5f6f7f]">SURVIVAL PROTOCOL</div>
        </div>
        {session && (
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[10px] tracking-[0.16em] text-[#5f6f7f]">SURVIVORS</div>
              <div className={`${condensed.className} text-2xl font-semibold text-[#eef3f8]`}>{session.survivors}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.16em] text-[#5f6f7f]">ROUND</div>
              <div className={`${condensed.className} text-2xl font-semibold text-[#eef3f8]`}>{session.round || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.16em] text-[#5f6f7f]">TIME LEFT</div>
              <div className={`${condensed.className} text-2xl font-semibold text-[#ffb238]`}>00:{timeLeftStr(session.phaseEndsAt)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Participants list */}
      {session && showList && (
        <div className="absolute top-28 left-6 w-52 max-h-[60vh] overflow-hidden p-3.5 bg-black/40 border border-white/8 backdrop-blur-sm">
          <div className="text-[10px] tracking-[0.16em] text-[#5f6f7f] mb-2">
            {session.status === "JOIN" ? `TYPE ${session.joinKeyword.toUpperCase()} TO ENTER` : "PARTICIPANTS — READY?"}
          </div>
          {session.players.map((p) => (
            <div key={p.kickUsername} className="flex items-center justify-between text-xs text-[#aebbc8] py-0.5 opacity-90">
              <span>{p.kickUsername}</span>
              {session.status === "READY" && <span className={p.ready ? "text-[#4fd18b]" : "text-[#5f6f7f]"}>{p.ready ? "✓" : "…"}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Elevator labels */}
      {overlay.elevators.map((ev) => {
        const data = session?.elevators.find((e) => e.letter === ev.letter);
        return (
          <div
            key={ev.letter}
            className="absolute -translate-x-1/2 -translate-y-full text-center pointer-events-none"
            style={{ top: ev.y, left: ev.x }}
          >
            <div className="text-[11px] tracking-[0.14em] text-[#8fa3b8]">LIFT {ev.letter}</div>
            <div className={`${condensed.className} font-semibold text-xl ${data?.status === "dead" ? "text-red-400" : "text-[#eef3f8]"}`}>
              {data?.required != null ? `${data.current} / ${data.required}` : data?.current ?? 0}
            </div>
          </div>
        );
      })}

      {/* Avatar name tags */}
      {overlay.avatars.map((av) => (
        <div
          key={av.name}
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none text-[10px] text-[#cfe0ee] bg-black/50 border border-white/8 px-1.5 py-0.5 whitespace-nowrap"
          style={{ top: av.y, left: av.x }}
        >
          {av.name}
        </div>
      ))}

      {/* Caption */}
      <div className="absolute left-1/2 bottom-16 -translate-x-1/2 text-center min-w-[300px] pointer-events-none px-4">
        {session?.caption && (
          <>
            <div
              key={session.caption}
              className={`${condensed.className} font-semibold text-3xl tracking-[0.06em] text-[#eef3f8]`}
              style={{ animation: "lift-fade-in 0.5s ease" }}
            >
              {session.caption}
            </div>
            {session.captionSub && (
              <div
                key={session.captionSub}
                className="text-sm tracking-[0.08em] text-[#8fa3b8] mt-1.5"
                style={{ animation: "lift-fade-in 0.6s ease" }}
              >
                {session.captionSub}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sync stabilizing indicator */}
      {isSync && (
        <div className="absolute left-1/2 bottom-9 -translate-x-1/2 w-80 h-1 bg-white/10">
          <div className="h-full bg-[#4fd18b] animate-pulse" style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}
