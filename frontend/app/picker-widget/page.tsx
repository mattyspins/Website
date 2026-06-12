"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { pickerApi, ViewerPicker, PickerUser } from "@/lib/api/viewerPicker";
import { getSocket } from "@/lib/socket";

function uname(u: PickerUser | null | undefined) {
  if (!u) return "?";
  return u.kickUsername ?? u.displayName;
}

function Avatar({ u, size }: { u: PickerUser | null | undefined; size: number }) {
  const n = uname(u);
  if (u?.avatarUrl) {
    return (
      <img
        src={u.avatarUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.5)", fontWeight: 700,
      fontSize: size * 0.42, flexShrink: 0,
    }}>
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// Continuously scrolling list of entries — scroll position is NOT reset on new entries
function EntryRoll({ entries }: { entries: ViewerPicker["entries"] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef   = useRef(0);
  const rafRef   = useRef<number | null>(null);
  const SPEED    = 30; // px per second

  const hasEntries = entries.length > 0;

  useEffect(() => {
    if (!trackRef.current || !hasEntries) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Only reset scroll position when going from 0 entries to first entries (fresh draw)
    // When new entries arrive mid-draw, the RAF continues without interruption
    posRef.current = 0;

    const track = trackRef.current;
    let last = performance.now();

    const tick = (now: number) => {
      const dt  = (now - last) / 1000;
      last = now;
      const half = track.scrollHeight / 2; // list is doubled
      posRef.current = (posRef.current + SPEED * dt) % half;
      track.style.transform = `translateY(-${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [hasEntries]); // only restart when going between 0 ↔ non-zero entries

  if (!hasEntries) {
    return (
      <div style={{ padding: "10px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 10, letterSpacing: 1 }}>
        Waiting for entries…
      </div>
    );
  }

  const doubled = [...entries, ...entries];

  return (
    <div style={{
      height: 108, overflow: "hidden",
      maskImage: "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
      WebkitMaskImage: "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
    }}>
      <div ref={trackRef} style={{ willChange: "transform" }}>
        {doubled.map((e, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "3px 10px", height: 30,
          }}>
            <Avatar u={e.user} size={20} />
            <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {uname(e.user)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Winner card shown after draw
function WinnerReveal({ winner }: { winner: PickerUser }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "14px 10px 12px", gap: 9,
      opacity: on ? 1 : 0, transition: "opacity 0.5s ease",
    }}>
      <span style={{ fontSize: 24 }}>🏆</span>

      {/* Glowing avatar ring */}
      <div style={{
        padding: 3, borderRadius: "50%",
        background: "linear-gradient(135deg,#f59e0b,#fde68a,#f59e0b)",
        boxShadow: "0 0 18px rgba(245,158,11,0.8), 0 0 36px rgba(245,158,11,0.35)",
      }}>
        <Avatar u={winner} size={56} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          color: "#fcd34d", fontWeight: 800, fontSize: 17,
          letterSpacing: 0.3,
          textShadow: "0 0 14px rgba(245,158,11,0.65)",
        }}>
          {uname(winner)}
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>
          Winner
        </div>
      </div>
    </div>
  );
}

// ─── Main Widget ───────────────────────────────────────────────────────────────

export default function PickerWidget() {
  const [picker, setPicker] = useState<ViewerPicker | null>(null);
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
      const data = await pickerApi.getActive();
      setPicker(data ?? null);
    } catch { /* ignore */ }
  }, []);

  // Poll every 20 s as fallback
  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  // Follow the active picker's Socket.IO room
  useEffect(() => {
    const socket = getSocket();

    if (prevIdRef.current && prevIdRef.current !== picker?.id) {
      socket.emit("leavePicker", prevIdRef.current);
    }
    if (!picker?.id) return;

    socket.emit("joinPicker", picker.id);
    prevIdRef.current = picker.id;

    const onUpdate = (updated: ViewerPicker) => {
      if (updated.id !== picker.id) return;
      setPicker(updated);
      // After winner shows for 15 s, go back to idle
      if (updated.status === "COMPLETED") setTimeout(load, 15_000);
    };

    socket.on("picker:updated", onUpdate);
    return () => { socket.off("picker:updated", onUpdate); };
  }, [picker?.id, load]);

  const W = 210; // widget width px

  // ── No active draw ──────────────────────────────────────────────────────
  if (!picker) {
    return (
      <div style={{ padding: 6, width: W, fontFamily: "system-ui,sans-serif" }}>
        <div style={{
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "12px 10px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 22, marginBottom: 5 }}>🎯</div>
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
            No Active Draw
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = picker.status === "COMPLETED";
  const isOpen      = picker.status === "OPEN";

  return (
    <div style={{ padding: 6, width: W, fontFamily: "system-ui,sans-serif", userSelect: "none" }}>
      <div style={{
        background: "rgba(0,0,0,0.72)",
        border: `1px solid ${isCompleted ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.09)"}`,
        borderRadius: 12, overflow: "hidden",
        boxShadow: isCompleted ? "0 0 24px rgba(245,158,11,0.15)" : "none",
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}>

        {/* ── Title row ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 10px", gap: 6,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>🎯</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {picker.label ?? picker.keyword}
            </span>
          </div>

          {/* Status badge + entry count */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {isOpen && (
              <>
                <span style={{
                  color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700,
                  background: "rgba(255,255,255,0.07)", borderRadius: 5, padding: "1px 5px",
                }}>
                  {picker.entries.length}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow: "0 0 6px #4ade80",
                    animation: "blink 1.4s ease-in-out infinite",
                  }} />
                  <span style={{ color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Live</span>
                </div>
              </>
            )}
            {isCompleted && (
              <span style={{ color: "#fcd34d", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Done</span>
            )}
            {picker.status === "CLOSED" && (
              <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Closed</span>
            )}
          </div>
        </div>

        {/* ── Open: keyword + scroller ── */}
        {isOpen && (
          <>
            <div style={{ padding: "5px 10px 4px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Type in chat:
              </span>
              <span style={{
                background: "rgba(99,102,241,0.22)",
                border: "1px solid rgba(99,102,241,0.45)",
                color: "#a5b4fc", fontSize: 12, fontWeight: 800,
                padding: "1px 8px", borderRadius: 6, letterSpacing: 0.5,
              }}>
                {picker.keyword}
              </span>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 2 }}>
              <EntryRoll entries={picker.entries} />
            </div>
          </>
        )}

        {/* ── Completed: winner reveal ── */}
        {isCompleted && picker.winner && (
          <WinnerReveal winner={picker.winner} />
        )}

        {/* ── Closed (drawing) ── */}
        {picker.status === "CLOSED" && (
          <div style={{ padding: "14px 10px", textAlign: "center", color: "rgba(255,255,255,0.22)", fontSize: 10, letterSpacing: 1 }}>
            Drawing winner…
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
