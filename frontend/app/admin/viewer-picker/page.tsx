"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { pickerApi, ViewerPicker, PickerUser } from "@/lib/api/viewerPicker";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function name(u: PickerUser | null | undefined) {
  if (!u) return "?";
  return u.kickUsername ?? u.displayName;
}

function Avatar({ u, size = 8 }: { u: PickerUser | null | undefined; size?: number }) {
  const n = name(u);
  if (u?.avatarUrl) {
    return <img src={u.avatarUrl} alt="" className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold shrink-0`}
      style={{ fontSize: size * 2 }}>
      {n[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Spin Wheel Animation ─────────────────────────────────────────────────────

function SpinDrum({
  entries,
  spinning,
  winner,
  onSpinDone,
}: {
  entries: { user: PickerUser }[];
  spinning: boolean;
  winner: PickerUser | null;
  onSpinDone: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const ITEM_H = 72; // px per slot item
  const SPIN_DURATION = 12000; // ms

  const reel = useMemo(() => {
    if (entries.length === 0) return [] as PickerUser[];
    const pool = entries.map((e) => e.user);
    const repeated: PickerUser[] = [];
    while (repeated.length < Math.max(40, pool.length * 4)) {
      for (const u of pool) repeated.push(u);
    }
    for (let i = repeated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [repeated[i], repeated[j]] = [repeated[j], repeated[i]];
    }
    if (winner) {
      // Place winner at reel.length - 5; stopOffset = (reel.length - 6) * ITEM_H
      // puts that index at 72px from the top = center of the 3-slot window
      const targetIdx = repeated.length - 5;
      const existingIdx = repeated.findIndex((u) => u.id === winner.id);
      if (existingIdx !== -1 && existingIdx !== targetIdx) {
        [repeated[existingIdx], repeated[targetIdx]] = [repeated[targetIdx], repeated[existingIdx]];
      }
    }
    return repeated;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, winner?.id]);

  const totalH = reel.length * ITEM_H;
  // -6 (not -5) so the winner slot lands in the center highlighted row, not the top row
  const stopOffset = winner ? (reel.length - 6) * ITEM_H : 0;

  useEffect(() => {
    if (!spinning || !containerRef.current) return;
    startTimeRef.current = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const eased = easeOut(progress);

      const fastDistance = totalH * 3;
      const currentOffset = (fastDistance + stopOffset) * eased;
      const wrapped = currentOffset % totalH;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(-${wrapped}px)`;
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        if (containerRef.current) {
          containerRef.current.style.transform = `translateY(-${stopOffset % totalH}px)`;
        }
        setTimeout(onSpinDone, 200);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [spinning]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[216px] text-white/20 text-sm">
        No entries yet…
      </div>
    );
  }

  return (
    <div className="relative h-[216px] overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[72px] border-y-2 border-yellow-400/60 bg-yellow-400/5 z-10 pointer-events-none" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,1)]">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M15 5L7 12L15 19V5Z" />
        </svg>
      </div>

      <div ref={containerRef} className="will-change-transform">
        {reel.map((u, i) => (
          <div key={i} className="flex items-center gap-3 px-4 h-[72px]">
            <Avatar u={u} size={9} />
            <span className="text-white font-semibold text-lg truncate">{name(u)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fireworks ───────────────────────────────────────────────────────────────

function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#facc15", "#4ade80", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#34d399", "#ffffff"];

    interface Particle { x: number; y: number; vx: number; vy: number; color: string; alpha: number; radius: number; }
    const particles: Particle[] = [];

    const burst = (x: number, y: number) => {
      for (let i = 0; i < 70; i++) {
        const angle = (Math.PI * 2 * i) / 70 + (Math.random() - 0.5) * 0.4;
        const speed = 4 + Math.random() * 9;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, color: colors[Math.floor(Math.random() * colors.length)], alpha: 1, radius: 2 + Math.random() * 3 });
      }
    };

    const schedule = [
      { x: 0.2,  y: 0.25, delay: 100  },
      { x: 0.8,  y: 0.2,  delay: 400  },
      { x: 0.5,  y: 0.12, delay: 700  },
      { x: 0.15, y: 0.5,  delay: 1000 },
      { x: 0.85, y: 0.45, delay: 1300 },
      { x: 0.35, y: 0.2,  delay: 1700 },
      { x: 0.65, y: 0.3,  delay: 2100 },
      { x: 0.25, y: 0.35, delay: 2500 },
      { x: 0.75, y: 0.25, delay: 2900 },
      { x: 0.5,  y: 0.1,  delay: 3300 },
    ];

    let startTime: number | null = null;
    let raf: number;
    const fired = new Set<number>();

    const animate = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      schedule.forEach((b, bi) => {
        if (!fired.has(bi) && elapsed >= b.delay) { burst(b.x * canvas.width, b.y * canvas.height); fired.add(bi); }
      });

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.98; p.alpha -= 0.013;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (elapsed < 4000 || particles.length > 0) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[60]" />;
}

// ─── Winner Reveal ────────────────────────────────────────────────────────────

function WinnerReveal({
  winner,
  onClose,
  onRedraw,
}: {
  winner: PickerUser;
  onClose: () => void;
  onRedraw?: () => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 50); }, []);

  return (
    <>
    <Fireworks />
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${show ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex flex-col items-center gap-5 bg-gradient-to-b from-yellow-900/60 to-[#0a0a0a] border border-yellow-400/40 rounded-3xl px-14 py-12 shadow-2xl shadow-yellow-900/40 transition-all duration-500 ${show ? "scale-100 translate-y-0" : "scale-90 translate-y-8"}`}>
        <div className="text-6xl animate-bounce drop-shadow-[0_0_24px_rgba(250,204,21,0.6)]">🎉</div>
        <p className="text-yellow-400/70 text-xs font-black uppercase tracking-[0.3em]">Winner!</p>
        {winner.avatarUrl && (
          <img src={winner.avatarUrl} alt="" className="w-24 h-24 rounded-full ring-4 ring-yellow-400/60 shadow-[0_0_32px_rgba(250,204,21,0.4)]" />
        )}
        <p className="text-white font-black text-4xl tracking-tight text-center">{name(winner)}</p>
        {winner.kickUsername && winner.displayName !== winner.kickUsername && (
          <p className="text-white/40 text-sm">{winner.displayName}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {onRedraw && (
            <button
              onClick={onRedraw}
              className="px-6 py-3 bg-white/10 border border-white/20 text-white/70 font-semibold rounded-xl hover:bg-white/15 transition-colors text-sm"
            >
              🔄 Re-draw
            </button>
          )}
          <button onClick={onClose} className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors text-sm">
            Awesome! 🎊
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminViewerPickerPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [pickers, setPickers] = useState<ViewerPicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [label, setLabel] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinEntries, setSpinEntries] = useState<ViewerPicker["entries"]>([]);
  const [showWinner, setShowWinner] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<PickerUser | null>(null);
  const [lastCompleted, setLastCompleted] = useState<ViewerPicker | null>(null);
  const [manualUsername, setManualUsername] = useState("");
  const [copiedKeyword, setCopiedKeyword] = useState(false);
  const pendingPickerRef = useRef<ViewerPicker | null>(null);

  const active = pickers.find((p) => p.status === "OPEN") ?? null;
  const past = pickers.filter((p) => p.status === "COMPLETED" || p.status === "CLOSED");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!d.user?.isAdmin) router.push("/"); else setAuthLoading(false); })
      .catch(() => router.push("/"));
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await pickerApi.getAll();
      setPickers(data);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Single socket listener — joins the active picker room and handles all updates
  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => { if (active) socket.emit("joinPicker", active.id); };
    if (active) {
      joinRoom();
      socket.on("connect", joinRoom);
    }

    const handle = (updated: ViewerPicker) => {
      setPickers((prev) => {
        const exists = prev.find((p) => p.id === updated.id);
        if (exists) return prev.map((p) => p.id === updated.id ? updated : p);
        return [updated, ...prev];
      });
    };
    socket.on("picker:updated", handle);

    return () => {
      if (active) {
        socket.emit("leavePicker", active.id);
        socket.off("connect", joinRoom);
      }
      socket.off("picker:updated", handle);
    };
  }, [active?.id]);

  const withAction = async (fn: () => Promise<ViewerPicker>) => {
    setActionLoading(true); setError(null);
    try {
      const updated = await fn();
      setPickers((prev) => {
        const exists = prev.find((p) => p.id === updated.id);
        if (exists) return prev.map((p) => p.id === updated.id ? updated : p);
        return [updated, ...prev];
      });
      return updated;
    } catch (e: any) { setError(e.message); return null; }
    finally { setActionLoading(false); }
  };

  const handleCreate = async () => {
    if (!keyword.trim()) { setError("Keyword is required"); return; }
    await withAction(() => pickerApi.create(keyword.trim(), label.trim() || undefined));
    setKeyword(""); setLabel("");
    setLastCompleted(null);
  };

  const handleClose = () => active && withAction(() => pickerApi.close(active.id));

  const handleDraw = async () => {
    if (!active || spinning) return;
    const entrySnapshot = [...active.entries];
    setActionLoading(true); setError(null);
    try {
      const updated = await pickerApi.draw(active.id);
      pendingPickerRef.current = updated;
      setSpinEntries(entrySnapshot);
      setPendingWinner(updated.winner);
      setSpinning(true);
    } catch (e: any) {
      setError(e.message);
    } finally { setActionLoading(false); }
  };

  const handleRedraw = async (pickerId: string) => {
    if (spinning) return;
    const picker = pickers.find((p) => p.id === pickerId) ?? lastCompleted;
    if (!picker) return;
    const entrySnapshot = [...picker.entries];
    setActionLoading(true); setError(null);
    try {
      const updated = await pickerApi.draw(pickerId);
      pendingPickerRef.current = updated;
      setSpinEntries(entrySnapshot);
      setPendingWinner(updated.winner);
      setSpinning(true);
    } catch (e: any) {
      setError(e.message);
    } finally { setActionLoading(false); }
  };

  const handleSpinDone = () => {
    setSpinning(false);
    if (pendingPickerRef.current) {
      const u = pendingPickerRef.current;
      setPickers((prev) => prev.map((p) => p.id === u.id ? u : p));
      setLastCompleted(u);
      pendingPickerRef.current = null;
    }
    if (pendingWinner) setShowWinner(true);
  };

  const handleAddEntry = async () => {
    if (!active || !manualUsername.trim()) return;
    setActionLoading(true); setError(null);
    try {
      const updated = await pickerApi.addEntry(active.id, manualUsername.trim());
      setPickers((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      setManualUsername("");
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this picker?")) return;
    setActionLoading(true);
    try {
      await pickerApi.delete(id);
      setPickers((prev) => prev.filter((p) => p.id !== id));
      if (lastCompleted?.id === id) setLastCompleted(null);
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw);
    setCopiedKeyword(true);
    setTimeout(() => setCopiedKeyword(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm mb-4 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Viewer Picker</h1>
              <p className="text-white/40 text-sm mt-0.5">Set a keyword — viewers type it in Kick chat to enter the draw</p>
            </div>
            <a
              href="/picker-widget"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              OBS Widget
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left: Setup + Entries ── */}
          <div className="space-y-4">

            {/* Active picker */}
            {active && (
              <div className="bg-white/5 border border-yellow-400/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <p className="text-white font-bold">
                        {active.label || "Draw Open"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-white/40 text-xs">
                        Type{" "}
                        <code className="bg-white/10 text-yellow-300 px-1.5 py-0.5 rounded font-mono">{active.keyword}</code>
                        {" "}in Kick chat to enter
                      </p>
                      <button
                        onClick={() => copyKeyword(active.keyword)}
                        className="text-white/25 hover:text-yellow-400 transition-colors"
                        title="Copy keyword"
                      >
                        {copiedKeyword ? (
                          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClose()}
                    disabled={actionLoading}
                    className="px-3 py-1.5 border border-white/15 text-white/40 text-xs rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    Close Entries
                  </button>
                </div>

                {/* Entry counter */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-yellow-400/8 border border-yellow-400/15 rounded-xl">
                  <span className="text-2xl font-black text-yellow-400">{active.entries.length}</span>
                  <span className="text-white/60 text-sm">{active.entries.length === 1 ? "viewer" : "viewers"} in the draw</span>
                </div>

                {/* Live entry list */}
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {active.entries.length === 0 ? (
                    <p className="text-white/25 text-sm text-center py-6">Waiting for viewers to enter…</p>
                  ) : (
                    active.entries.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                        <span className="text-white/20 text-xs w-5 shrink-0 text-right">{i + 1}</span>
                        <Avatar u={e.user} size={7} />
                        <span className="text-white/80 text-sm font-medium truncate">{name(e.user)}</span>
                        <span className="ml-auto text-white/20 text-[10px] shrink-0">
                          {new Date(e.enteredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Manual entry */}
                <div className="mt-3 pt-3 border-t border-white/8">
                  <p className="text-white/30 text-xs mb-2">Add viewer manually</p>
                  <div className="flex gap-2">
                    <input
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
                      placeholder="Kick username"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-yellow-400/40 font-mono"
                    />
                    <button
                      onClick={handleAddEntry}
                      disabled={actionLoading || !manualUsername.trim()}
                      className="px-3 py-1.5 bg-white/8 border border-white/10 text-white/60 text-xs rounded-lg hover:bg-white/12 disabled:opacity-30 transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Completed picker — shown after a draw until user starts a new one */}
            {!active && lastCompleted && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                      <p className="text-white/60 font-bold">{lastCompleted.label || "Draw Completed"}</p>
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">
                      <code className="bg-white/8 text-white/50 px-1.5 py-0.5 rounded font-mono">{lastCompleted.keyword}</code>
                      {" · "}{lastCompleted.entries.length} {lastCompleted.entries.length === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                </div>

                {lastCompleted.winner && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-400/8 border border-yellow-400/15 rounded-xl mb-4">
                    <span className="text-yellow-400 text-lg shrink-0">🏆</span>
                    <Avatar u={lastCompleted.winner} size={9} />
                    <div className="min-w-0">
                      <p className="text-white font-bold truncate">{name(lastCompleted.winner)}</p>
                      <p className="text-white/30 text-xs">Winner</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setLastCompleted(null)}
                  className="w-full py-2.5 border border-white/10 text-white/50 rounded-xl hover:bg-white/5 text-sm transition-colors"
                >
                  + Start New Draw
                </button>
              </div>
            )}

            {/* Create form — shown when no active draw and user dismissed completed view */}
            {!active && !lastCompleted && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4">Start a New Draw</h2>
                <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Keyword *</label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. wheel"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-3 focus:outline-none focus:border-yellow-400/50 font-mono text-lg tracking-widest"
                />
                <label className="block text-xs text-white/50 mb-1 uppercase tracking-widest">Label (optional)</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Giveaway Draw"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-yellow-400/50 text-sm"
                />
                <button
                  onClick={handleCreate}
                  disabled={actionLoading || !keyword.trim()}
                  className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition-colors"
                >
                  🎯 Open Draw
                </button>
              </div>
            )}
          </div>

          {/* ── Right: Wheel + Draw Button ── */}
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">Draw a Winner</h2>

              {/* Spin drum */}
              <div className="bg-[#0d0d0d] border border-white/8 rounded-xl mb-4 overflow-hidden">
                <SpinDrum
                  entries={spinning ? spinEntries : (active?.entries ?? lastCompleted?.entries ?? [])}
                  spinning={spinning}
                  winner={pendingWinner}
                  onSpinDone={handleSpinDone}
                />
              </div>

              {/* Spin / Re-draw / placeholder button */}
              {active ? (
                <button
                  onClick={handleDraw}
                  disabled={actionLoading || spinning || active.entries.length === 0}
                  className={`w-full py-4 rounded-xl font-black text-lg tracking-wide transition-all ${
                    spinning
                      ? "bg-yellow-400/40 text-black/40 cursor-not-allowed"
                      : "bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-900/30 active:scale-95"
                  } disabled:opacity-40`}
                >
                  {spinning ? "🎰 Spinning…" : "🎰 Spin & Draw Winner"}
                </button>
              ) : lastCompleted ? (
                <button
                  onClick={() => handleRedraw(lastCompleted.id)}
                  disabled={actionLoading || spinning || lastCompleted.entries.length <= 1}
                  className="w-full py-4 rounded-xl font-black text-lg tracking-wide bg-white/8 border border-white/10 text-white/60 hover:bg-white/12 disabled:opacity-40 transition-all active:scale-95"
                  title={lastCompleted.entries.length <= 1 ? "Need at least 2 entries to re-draw" : "Pick a different winner"}
                >
                  {spinning ? "🎰 Spinning…" : "🔄 Re-draw"}
                </button>
              ) : (
                <div className="w-full py-4 rounded-xl text-center text-white/20 text-sm border border-white/5">
                  Start a draw first
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Past Winners ── */}
        {past.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4">Past Draws</p>
            <div className="space-y-2">
              {past.map((p) => (
                <div key={p.id} className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-xl px-5 py-4">
                  <div className="shrink-0">
                    <code className="text-yellow-400/80 font-mono text-sm bg-yellow-400/10 px-2 py-0.5 rounded">
                      {p.keyword}
                    </code>
                    {p.label && <span className="ml-2 text-white/40 text-xs">{p.label}</span>}
                  </div>

                  <div className="text-white/15 text-sm shrink-0">·</div>

                  <span className="text-white/40 text-sm shrink-0">{p.entries.length} entries</span>

                  <div className="text-white/15 text-sm shrink-0">·</div>

                  {p.winner ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-yellow-400 text-sm shrink-0">🏆</span>
                      <Avatar u={p.winner} size={6} />
                      <span className="text-white font-semibold text-sm truncate">{name(p.winner)}</span>
                    </div>
                  ) : (
                    <span className="text-white/25 text-sm flex-1">No winner drawn</span>
                  )}

                  <span className="text-white/20 text-xs shrink-0 ml-auto">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>

                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={actionLoading}
                    className="ml-2 text-white/20 hover:text-red-400 transition-colors text-sm shrink-0"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Winner reveal overlay */}
      {showWinner && pendingWinner && (
        <WinnerReveal
          winner={pendingWinner}
          onClose={() => { setShowWinner(false); load(); }}
          onRedraw={lastCompleted && lastCompleted.entries.length > 1
            ? () => { setShowWinner(false); handleRedraw(lastCompleted.id); }
            : undefined}
        />
      )}
    </div>
  );
}
