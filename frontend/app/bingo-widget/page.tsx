"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { bingoApi, BingoGame } from "@/lib/api/bonusBingo";
import { getSocket } from "@/lib/socket";
import { kickName, lineLabel, getLineWinners } from "@/lib/bingoUtils";

// ─── Mini Grid ────────────────────────────────────────────────────────────────

function MiniGrid({ game }: { game: BingoGame }) {
  const { cells, gridSize, currentCellId, lineWins } = game;

  const wonKeys = new Set<string>();
  for (const lw of lineWins) {
    if (lw.lineType === "row") for (let c = 0; c < gridSize; c++) wonKeys.add(`${lw.lineIndex}:${c}`);
    else if (lw.lineType === "col") for (let r = 0; r < gridSize; r++) wonKeys.add(`${r}:${lw.lineIndex}`);
    else if (lw.lineType === "diag" && lw.lineIndex === 0) for (let i = 0; i < gridSize; i++) wonKeys.add(`${i}:${i}`);
    else if (lw.lineType === "diag" && lw.lineIndex === 1) for (let i = 0; i < gridSize; i++) wonKeys.add(`${i}:${gridSize - 1 - i}`);
  }

  const grid = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => cells.find(cell => cell.row === r && cell.col === c)!)
  );

  return (
    <div
      className="grid gap-1 w-full"
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const isActive = cell.id === currentCellId;
          const isGreen = cell.status === "GREEN";
          const isWonLine = wonKeys.has(`${r}:${c}`);

          let cellClass = "bg-white/5 border-white/10 text-white/20";
          if (isGreen) {
            cellClass = isWonLine
              ? "bg-green-500/50 border-green-400/80 text-green-200"
              : "bg-green-500/25 border-green-500/40 text-green-300";
          } else if (isActive) {
            cellClass = "bg-amber-500/30 border-amber-400/80 text-amber-300 animate-pulse";
          }

          const slot = cell.slotName;

          return (
            <div
              key={cell.id}
              className={`aspect-square rounded border flex items-center justify-center overflow-hidden p-0.5 ${cellClass}`}
            >
              {isGreen ? (
                <div className="flex flex-col items-center justify-center w-full px-0.5 gap-0.5">
                  <span className="text-[9px] font-semibold leading-tight text-center text-green-200 w-full truncate">
                    {kickName(cell.claimedBy)}
                  </span>
                  {slot && (
                    <span className="text-[8px] leading-tight text-center text-green-400/70 w-full truncate">
                      {slot}
                    </span>
                  )}
                </div>
              ) : isActive && slot ? (
                <span className="text-[9px] leading-tight text-center w-full px-0.5 line-clamp-2">
                  {slot}
                </span>
              ) : isActive ? (
                <span className="text-[10px] font-bold">●</span>
              ) : slot ? (
                <span className="text-[8px] leading-tight text-center w-full px-0.5 text-white/20 line-clamp-2">
                  {slot}
                </span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Line Alert Banner ────────────────────────────────────────────────────────

function LineAlertBanner({
  alert,
  onDone,
}: {
  alert: { lineType: string; lineIndex: number; points: number };
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  const label = lineLabel(alert.lineType, alert.lineIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-pop-in flex flex-col items-center gap-2 bg-[#060f06]/95 border-2 border-green-400/70 rounded-2xl px-8 py-7 shadow-2xl shadow-green-900/60 text-center">
        <div className="text-5xl animate-bounce">🏆</div>
        <p className="text-green-300 font-black text-4xl tracking-tight drop-shadow-lg">BINGO!</p>
        <p className="text-white font-semibold text-base">{label} complete!</p>
        <p className="text-yellow-400 font-bold text-sm">+{alert.points.toLocaleString()} coins awarded</p>
      </div>
    </div>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  REGISTRATION: { label: "Registration Open", dot: "bg-blue-400",              text: "text-blue-300" },
  ACTIVE:       { label: "Live",              dot: "bg-green-400 animate-pulse", text: "text-green-300" },
  COMPLETED:    { label: "Completed",          dot: "bg-yellow-400",             text: "text-yellow-300" },
  CANCELLED:    { label: "Cancelled",          dot: "bg-red-400",                text: "text-red-300" },
  DRAFT:        { label: "Draft",              dot: "bg-white/30",               text: "text-white/40" },
} as const;

// ─── Widget ───────────────────────────────────────────────────────────────────

export default function BingoWidget() {
  const [game, setGame] = useState<BingoGame | null>(null);
  const [lineAlert, setLineAlert] = useState<{ lineType: string; lineIndex: number; points: number } | null>(null);
  const prevWinsRef = useRef(0);

  // Force transparent background for OBS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "html,body{background:transparent!important}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const findActiveGame = useCallback(async () => {
    try {
      const games = await bingoApi.getAll();
      const active = games.find(g => g.status === "ACTIVE" || g.status === "REGISTRATION");
      setGame(prev => {
        if (active?.id !== prev?.id) prevWinsRef.current = 0;
        return active ?? null;
      });
    } catch {
      // silently ignore network errors
    }
  }, []);

  // Poll every 30 s for game discovery / recovery
  useEffect(() => {
    findActiveGame();
    const id = setInterval(findActiveGame, 30_000);
    return () => clearInterval(id);
  }, [findActiveGame]);

  // Socket subscription
  useEffect(() => {
    if (!game) return;
    const socket = getSocket();
    socket.emit("bingo:join", game.id);

    const handleUpdate = (updated: BingoGame) => {
      if (updated.id !== game.id) return;

      if (updated.lineWins.length > prevWinsRef.current) {
        const newest = updated.lineWins[updated.lineWins.length - 1];
        setLineAlert({ lineType: newest.lineType, lineIndex: newest.lineIndex, points: newest.pointsEach });
      }
      prevWinsRef.current = updated.lineWins.length;

      setGame(updated);

      if (updated.status === "COMPLETED" || updated.status === "CANCELLED") {
        setTimeout(findActiveGame, 8_000);
      }
    };

    socket.on("bingo:updated", handleUpdate);
    return () => {
      socket.emit("bingo:leave", game.id);
      socket.off("bingo:updated", handleUpdate);
    };
  }, [game?.id, findActiveGame]);

  // ── No active game ─────────────────────────────────────────────────────────
  if (!game) {
    return (
      <div className="p-3">
        <div className="bg-black/60 border border-white/10 rounded-xl p-6 text-center">
          <p className="text-4xl mb-3">🎱</p>
          <p className="text-white/50 text-xs tracking-widest uppercase">Waiting for Bonus Bingo…</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CFG[game.status] ?? STATUS_CFG.DRAFT;
  const activeCell = game.cells.find(c => c.id === game.currentCellId);
  const greenUserIds = new Set(
    game.cells.filter(c => c.status === "GREEN" && c.claimedById).map(c => c.claimedById!)
  );

  return (
    <div className="p-2.5 space-y-2 w-full font-sans select-none">
      {lineAlert && (
        <LineAlertBanner alert={lineAlert} onDone={() => setLineAlert(null)} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-black/70 border border-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🎱</span>
          <span className="text-white font-semibold text-sm truncate">{game.title}</span>
        </div>
        <div className={`flex items-center gap-1.5 shrink-0 ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className="text-xs font-medium whitespace-nowrap">{cfg.label}</span>
        </div>
      </div>

      {/* ── Current Player Spotlight ─────────────────────────────────────── */}
      {game.currentUser && game.status === "ACTIVE" && (
        <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl px-3 py-2.5">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-widest font-bold mb-1">▶ Now Playing</p>
          <p className="text-amber-300 font-bold text-xl leading-tight truncate">{kickName(game.currentUser)}</p>
          <p className="text-amber-200/50 text-xs mt-0.5 truncate">
            {activeCell?.slotName ? `🎰 ${activeCell.slotName}` : "Choosing slot…"}
          </p>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <div className="bg-black/70 border border-white/10 rounded-xl p-2.5">
        <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1.5">Board</p>
        <MiniGrid game={game} />
      </div>

      {/* ── Participants ──────────────────────────────────────────────────── */}
      {game.participants.length > 0 && (
        <div className="bg-black/70 border border-white/10 rounded-xl px-3 py-2.5">
          <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2">
            Players ({game.participants.length})
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {game.participants.slice(0, 14).map(p => {
              const isCurrent = p.userId === game.currentUser?.id;
              const hasWon = greenUserIds.has(p.userId);
              return (
                <div key={p.userId} className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 text-[11px] leading-none">
                    {isCurrent ? "▶" : hasWon ? "🏆" : "·"}
                  </span>
                  <span
                    className={`text-xs truncate leading-tight ${
                      isCurrent
                        ? "text-amber-300 font-semibold"
                        : hasWon
                        ? "text-green-300"
                        : "text-white/55"
                    }`}
                  >
                    {kickName(p.user)}
                  </span>
                </div>
              );
            })}
          </div>
          {game.participants.length > 14 && (
            <p className="text-white/30 text-[10px] mt-2">+{game.participants.length - 14} more</p>
          )}
        </div>
      )}

      {/* ── Line Wins ─────────────────────────────────────────────────────── */}
      {game.lineWins.length > 0 && (
        <div className="bg-black/70 border border-white/10 rounded-xl px-3 py-2.5">
          <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2">Lines Won</p>
          <div className="space-y-1.5">
            {game.lineWins.map((lw, i) => {
              const winners = getLineWinners(game.cells, lw, game.gridSize);
              return (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <span className="text-green-400 shrink-0 text-xs leading-none">✦</span>
                  <span className="text-green-300 text-xs font-semibold shrink-0 whitespace-nowrap">
                    {lineLabel(lw.lineType, lw.lineIndex)}
                  </span>
                  {winners.length > 0 && (
                    <span className="text-white/40 text-xs truncate">{winners.join(", ")}</span>
                  )}
                  <span className="text-yellow-400/70 text-[10px] shrink-0 ml-auto whitespace-nowrap">
                    +{lw.pointsEach.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
