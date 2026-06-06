"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { bingoApi, BingoGame } from "@/lib/api/bonusBingo";
import { getSocket } from "@/lib/socket";
import { kickName, lineLabel, getLineWinners } from "@/lib/bingoUtils";

// ─── Grid ─────────────────────────────────────────────────────────────────────

function MiniGrid({ game }: { game: BingoGame }) {
  const { cells, gridSize, currentCellId, lineWins, currentUser } = game;

  const wonKeys = new Set<string>();
  for (const lw of lineWins) {
    if (lw.lineType === "row") for (let c = 0; c < gridSize; c++) wonKeys.add(`${lw.lineIndex}:${c}`);
    else if (lw.lineType === "col") for (let r = 0; r < gridSize; r++) wonKeys.add(`${r}:${lw.lineIndex}`);
    else if (lw.lineType === "diag" && lw.lineIndex === 0) for (let i = 0; i < gridSize; i++) wonKeys.add(`${i}:${i}`);
    else if (lw.lineType === "diag" && lw.lineIndex === 1) for (let i = 0; i < gridSize; i++) wonKeys.add(`${i}:${gridSize - 1 - i}`);
  }

  const gridPx = 160;
  const gap = 3;
  const cellPx = Math.floor((gridPx - gap * (gridSize - 1)) / gridSize);

  const grid = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => cells.find(cell => cell.row === r && cell.col === c)!)
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, ${cellPx}px)`,
        gap: `${gap}px`,
        width: `${gridPx}px`,
        margin: "0 auto",
      }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const isActive = cell.id === currentCellId;
          const isGreen = cell.status === "GREEN";
          const isWonLine = wonKeys.has(`${r}:${c}`);

          let bg = "#ffffff0d";
          let border = "#ffffff1a";
          if (isGreen) { bg = isWonLine ? "#22c55e55" : "#22c55e33"; border = isWonLine ? "#4ade80cc" : "#22c55e66"; }
          else if (isActive) { bg = "#f59e0b33"; border = "#fbbf24cc"; }

          return (
            <div
              key={cell.id}
              style={{
                width: cellPx, height: cellPx,
                background: bg, border: `1px solid ${border}`,
                borderRadius: 5,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                overflow: "hidden", padding: "2px",
              }}
            >
              {isGreen ? (
                <>
                  <span style={{ fontSize: 8, lineHeight: 1.2, color: "#bbf7d0", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {kickName(cell.claimedBy)}
                  </span>
                  {cell.slotName && (
                    <span style={{ fontSize: 7, lineHeight: 1.1, color: "#4ade8099", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cell.slotName}
                    </span>
                  )}
                </>
              ) : isActive ? (
                <>
                  {currentUser && (
                    <span style={{ fontSize: 8, lineHeight: 1.2, color: "#fcd34d", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>
                      {kickName(currentUser)}
                    </span>
                  )}
                  {cell.slotName && (
                    <span style={{ fontSize: 7, lineHeight: 1.1, color: "#fbbf2499", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cell.slotName}
                    </span>
                  )}
                  {!currentUser && !cell.slotName && (
                    <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: "bold" }}>●</span>
                  )}
                </>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Line Alert ───────────────────────────────────────────────────────────────

function LineAlertBanner({ alert, onDone }: { alert: { lineType: string; lineIndex: number; points: number }; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-pop-in flex flex-col items-center gap-2 bg-[#060f06]/95 border-2 border-green-400/70 rounded-2xl px-8 py-7 shadow-2xl text-center">
        <div className="text-5xl animate-bounce">🏆</div>
        <p className="text-green-300 font-black text-4xl tracking-tight">BINGO!</p>
        <p className="text-white font-semibold text-base">{lineLabel(alert.lineType, alert.lineIndex)} complete!</p>
        <p className="text-yellow-400 font-bold text-sm">+{alert.points.toLocaleString()} coins</p>
      </div>
    </div>
  );
}

const STATUS_CFG = {
  REGISTRATION: { label: "Registering", dot: "bg-blue-400",               text: "text-blue-300" },
  ACTIVE:       { label: "Live",         dot: "bg-green-400 animate-pulse", text: "text-green-300" },
  COMPLETED:    { label: "Done",          dot: "bg-yellow-400",             text: "text-yellow-300" },
  CANCELLED:    { label: "Cancelled",     dot: "bg-red-400",                text: "text-red-300" },
  DRAFT:        { label: "Draft",         dot: "bg-white/30",               text: "text-white/40" },
} as const;

// ─── Widget ───────────────────────────────────────────────────────────────────

export default function BingoWidget() {
  const [game, setGame] = useState<BingoGame | null>(null);
  const [lineAlert, setLineAlert] = useState<{ lineType: string; lineIndex: number; points: number } | null>(null);
  const prevWinsRef = useRef(0);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "html,body{background:transparent!important;margin:0;padding:0}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const findActiveGame = useCallback(async () => {
    try {
      const games = await bingoApi.getAll();
      const active = games.find(g => g.status === "ACTIVE" || g.status === "REGISTRATION");
      setGame(prev => { if (active?.id !== prev?.id) prevWinsRef.current = 0; return active ?? null; });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { findActiveGame(); const id = setInterval(findActiveGame, 30_000); return () => clearInterval(id); }, [findActiveGame]);

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
      if (updated.status === "COMPLETED" || updated.status === "CANCELLED") setTimeout(findActiveGame, 8_000);
    };
    socket.on("bingo:updated", handleUpdate);
    return () => { socket.emit("bingo:leave", game.id); socket.off("bingo:updated", handleUpdate); };
  }, [game?.id, findActiveGame]);

  if (!game) {
    return (
      <div className="p-2">
        <div className="bg-black/60 border border-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl mb-1">🎱</p>
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Waiting for Bingo…</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CFG[game.status] ?? STATUS_CFG.DRAFT;
  const activeCell = game.cells.find(c => c.id === game.currentCellId);
  const greenUserIds = new Set(game.cells.filter(c => c.status === "GREEN" && c.claimedById).map(c => c.claimedById!));

  return (
    <div className="p-1.5 space-y-1.5 font-sans select-none" style={{ width: "180px" }}>
      {lineAlert && <LineAlertBanner alert={lineAlert} onDone={() => setLineAlert(null)} />}

      {/* ── Header ── */}
      <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs shrink-0">🎱</span>
          <span className="text-white font-semibold text-[10px] truncate">{game.title}</span>
        </div>
        <div className={`flex items-center gap-1 shrink-0 ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span className="text-[9px] font-medium">{cfg.label}</span>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="bg-black/70 border border-white/10 rounded-lg p-1.5">
        <MiniGrid game={game} />
      </div>

      {/* ── Current player ── */}
      {game.currentUser && game.status === "ACTIVE" && (
        <div className="bg-amber-950/60 border border-amber-500/40 rounded-lg px-2 py-1">
          <p className="text-amber-500/60 text-[8px] uppercase tracking-wider font-bold">▶ Now Playing</p>
          <p className="text-amber-300 font-bold text-[11px] leading-tight truncate">{kickName(game.currentUser)}</p>
          {activeCell?.slotName && (
            <p className="text-amber-200/50 text-[8px] truncate">🎰 {activeCell.slotName}</p>
          )}
        </div>
      )}

      {/* ── Participants ── */}
      {game.participants.length > 0 && (
        <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1">
          <p className="text-white/30 text-[8px] uppercase tracking-wider mb-0.5">Players ({game.participants.length})</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {game.participants.slice(0, 10).map(p => {
              const isCurrent = p.userId === game.currentUser?.id;
              const hasWon = greenUserIds.has(p.userId);
              return (
                <div key={p.userId} className="flex items-center gap-0.5 min-w-0">
                  <span className="shrink-0 text-[8px]">{isCurrent ? "▶" : hasWon ? "🏆" : "·"}</span>
                  <span className={`text-[9px] truncate ${isCurrent ? "text-amber-300 font-semibold" : hasWon ? "text-green-300" : "text-white/50"}`}>
                    {kickName(p.user)}
                  </span>
                </div>
              );
            })}
          </div>
          {game.participants.length > 10 && (
            <p className="text-white/25 text-[8px] mt-0.5">+{game.participants.length - 10} more</p>
          )}
        </div>
      )}

      {/* ── Line wins ── */}
      {game.lineWins.length > 0 && (
        <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1">
          <div className="space-y-0.5">
            {game.lineWins.map((lw, i) => {
              const winners = getLineWinners(game.cells, lw, game.gridSize);
              return (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  <span className="text-green-400 text-[8px] shrink-0">✦</span>
                  <span className="text-green-300 text-[8px] font-semibold shrink-0 whitespace-nowrap">{lineLabel(lw.lineType, lw.lineIndex)}</span>
                  {winners.length > 0 && <span className="text-white/40 text-[8px] truncate">{winners.join(", ")}</span>}
                  <span className="text-yellow-400/70 text-[7px] shrink-0 ml-auto">+{lw.pointsEach.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
