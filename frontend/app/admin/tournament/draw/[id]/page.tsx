"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { tournamentApi } from "@/lib/api/tournament";
import { Tournament, DrawStatus, DrawPoolPlayer, DrawSelectedPlayer, DrawReservePlayer } from "@/types/tournament";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type LocalPhase = "loading" | "ready" | "drawing" | "complete";

const HIGHLIGHT_TICK_MS = 90;
const PICK_TICK_MS = 550;

export default function DrawAnimationPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [phase, setPhase] = useState<LocalPhase>("loading");
  const [seedCommitmentHash, setSeedCommitmentHash] = useState<string | null>(null);
  const [drawSeed, setDrawSeed] = useState<string | null>(null);
  const [pool, setPool] = useState<DrawPoolPlayer[]>([]);
  const [revealed, setRevealed] = useState<DrawSelectedPlayer[]>([]);
  const [reserves, setReserves] = useState<DrawReservePlayer[]>([]);
  const [targetCount, setTargetCount] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const highlightTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!d.user?.isAdmin) router.push("/"); else setAuthLoading(false); })
      .catch(() => router.push("/"));
  }, []);

  const settle = (status: DrawStatus) => {
    setSeedCommitmentHash(status.seedCommitmentHash);
    setDrawSeed(status.drawSeed);
    setTargetCount(status.targetCount);
    setPool([]);
    setRevealed(status.selected);
    setReserves(status.reserves);
    setPhase("complete");
  };

  const loadInitial = useCallback(async () => {
    try {
      const [t, status] = await Promise.all([tournamentApi.getById(id), tournamentApi.getDrawStatus(id)]);
      setTournament(t);
      setSeedCommitmentHash(status.seedCommitmentHash);
      setTargetCount(status.targetCount);
      if (status.phase === "complete") {
        settle(status);
      } else {
        setPool(status.eligiblePool);
        setPhase("ready");
      }
    } catch {
      setError("Failed to load tournament");
    }
  }, [id]);

  useEffect(() => { if (!authLoading) loadInitial(); }, [authLoading, loadInitial]);

  // If a second admin/tab runs the draw first, catch up and settle instead of animating.
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("joinTournament", id);
    socket.on("tournament:updated", (updated: Tournament) => {
      if (updated.id !== id) return;
      setTournament(updated);
      if (phase === "ready" && updated.drawExecutedAt) {
        tournamentApi.getDrawStatus(id).then((s) => { if (s.phase === "complete") settle(s); });
      }
    });
    return () => {
      socket.emit("leaveTournament", id);
      socket.off("tournament:updated");
    };
  }, [id, phase]);

  useEffect(() => () => {
    if (highlightTimer.current) clearInterval(highlightTimer.current);
    if (pickTimer.current) clearInterval(pickTimer.current);
  }, []);

  const startDraw = async () => {
    setStarting(true);
    setError(null);
    try {
      // The server decides the outcome once, right now — everything after
      // this is just a client-side replay of an already-settled result.
      await tournamentApi.runDraw(id);
      const status = await tournamentApi.getDrawStatus(id);
      if (status.phase !== "complete") throw new Error("Draw did not complete");

      setSeedCommitmentHash(status.seedCommitmentHash);
      setDrawSeed(status.drawSeed);
      setReserves(status.reserves);
      setPhase("drawing");

      const finalSelected = status.selected;
      let animPool = [...pool];
      const animRevealed: DrawSelectedPlayer[] = [];

      highlightTimer.current = setInterval(() => {
        setHighlightIdx(animPool.length ? Math.floor(Math.random() * animPool.length) : -1);
      }, HIGHLIGHT_TICK_MS);

      pickTimer.current = setInterval(() => {
        const next = finalSelected[animRevealed.length];
        if (!next || animRevealed.length >= finalSelected.length) {
          if (highlightTimer.current) clearInterval(highlightTimer.current);
          if (pickTimer.current) clearInterval(pickTimer.current);
          setHighlightIdx(-1);
          setPhase("complete");
          return;
        }
        animPool = animPool.filter((p) => p.entryId !== next.entryId);
        animRevealed.push(next);
        setPool([...animPool]);
        setRevealed([...animRevealed]);
      }, PICK_TICK_MS);
    } catch (e: any) {
      setError(e.message ?? "Failed to run the draw");
      setStarting(false);
    }
  };

  if (authLoading || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--tt-gold)]" />
      </div>
    );
  }

  const seedRevealText = phase === "complete"
    ? `seed revealed: ${drawSeed ? `${drawSeed.slice(0, 12)}...` : "—"} — verify the draw yourself`
    : "seed hidden until draw completes";

  return (
    <div className="min-h-screen px-6 py-7 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center flex-wrap gap-3 mb-1.5">
          <div>
            <div className="tt-display text-[13px] tracking-[0.25em] text-white/60">LIVE RANDOM DRAW</div>
            <div className="tt-display text-3xl text-white">{tournament?.title ?? "Tournament"}</div>
          </div>
          <a
            href="/admin/tournament"
            className="text-xs no-underline border border-white/20 px-3.5 py-2 rounded text-white/70 hover:bg-white/5 transition-colors"
          >
            ← Back to admin
          </a>
        </div>

        <div className="text-xs text-white/50 font-mono my-3">
          Seed commitment published pre-draw: <span className="text-white/75">{seedCommitmentHash ? `${seedCommitmentHash.slice(0, 8)}...${seedCommitmentHash.slice(-4)}` : "—"}</span>
          {" — "}
          <span className={phase === "complete" ? "text-[color:var(--tt-gold)]" : "text-white/40"}>{seedRevealText}</span>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Eligible entrants", value: pool.length + revealed.length },
            { label: "Drawing", value: targetCount },
            { label: "Selected so far", value: `${revealed.length} / ${targetCount}` },
            { label: "Phase", value: phase === "ready" ? "Ready" : phase === "drawing" ? "Drawing…" : "Complete" },
          ].map((tile) => (
            <div key={tile.label} className="bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded-lg px-4 py-3.5">
              <div className="text-[11px] uppercase tracking-wide text-white/50">{tile.label}</div>
              <div className="tt-display text-2xl text-white">{tile.value}</div>
            </div>
          ))}
        </div>

        {phase === "ready" && (
          <button
            onClick={startDraw}
            disabled={starting}
            className="block mx-auto mb-7 px-10 py-4 rounded-lg bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] tt-display text-xl tracking-wide disabled:opacity-50 hover:bg-[color:var(--tt-gold-hover)] transition-colors"
          >
            {starting ? "STARTING…" : "START LIVE DRAW"}
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-5">
          <div className="bg-[color:var(--tt-bg-sunken)] border border-[color:var(--tt-border)] rounded-lg p-4">
            <div className="tt-display text-sm tracking-wide text-white/60 mb-2.5">ELIGIBLE POOL</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
              {pool.map((p, i) => (
                <div
                  key={p.entryId}
                  className={`text-center text-[11.5px] rounded px-2 py-1.5 border transition-colors ${
                    i === highlightIdx
                      ? "bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] border-[color:var(--tt-gold)] font-extrabold"
                      : "bg-[color:var(--tt-bg-elevated)] text-white/75 border-[color:var(--tt-border)]"
                  }`}
                >
                  {p.displayName}
                </div>
              ))}
              {pool.length === 0 && <p className="text-white/40 text-sm col-span-full">Pool empty.</p>}
            </div>
          </div>

          <div>
            <div className="bg-[color:var(--tt-bg-sunken)] border border-[color:var(--tt-gold-border)] rounded-lg p-4 mb-4 max-h-[280px] overflow-y-auto">
              <div className="tt-display text-sm tracking-wide text-[color:var(--tt-gold)] mb-2.5">SELECTED PARTICIPANTS</div>
              {revealed.map((p) => (
                <div key={p.entryId} className="flex justify-between py-1.5 border-b border-white/8 text-[12.5px]">
                  <span className="font-bold text-white">{p.seed}. {p.displayName}</span>
                  <span className="text-white/50">{p.slot ?? "—"}</span>
                </div>
              ))}
              {revealed.length === 0 && <p className="text-white/40 text-sm">Nobody selected yet.</p>}
            </div>

            {phase === "complete" && (
              <div className="bg-[color:var(--tt-bg-sunken)] border border-dashed border-[color:var(--tt-border-soft)] rounded-lg p-4">
                <div className="tt-display text-sm tracking-wide text-white/60 mb-2.5">RESERVES (in order)</div>
                {reserves.map((r) => (
                  <div key={r.entryId} className="flex justify-between py-1 text-xs text-white/65">
                    <span>#{r.rank} {r.displayName}</span>
                    <span>{r.slot ?? "—"}</span>
                  </div>
                ))}
                {reserves.length === 0 && <p className="text-white/40 text-xs">No reserves.</p>}
              </div>
            )}
          </div>
        </div>

        {phase === "complete" && (
          <div className="text-center mt-7">
            <a
              href="/tournament"
              className="inline-block px-8 py-4 rounded-lg bg-[color:var(--tt-pink)] text-[#1a0510] no-underline tt-display text-lg tracking-wide hover:opacity-90 transition-opacity"
            >
              BRACKET GENERATED — VIEW LIVE BRACKET →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
