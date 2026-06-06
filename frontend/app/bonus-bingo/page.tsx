"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { bingoApi, BingoGame, BingoCell } from "@/lib/api/bonusBingo";
import { getSocket } from "@/lib/socket";
import { API_ENDPOINTS } from "@/lib/api";
import SlotPicker from "@/components/SlotPicker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lineLabel(lineType: string, lineIndex: number, gridSize: number) {
  if (lineType === "row") return `Row ${lineIndex + 1}`;
  if (lineType === "col") return `Column ${lineIndex + 1}`;
  if (lineType === "diag" && lineIndex === 0) return "Main Diagonal";
  if (lineType === "diag" && lineIndex === 1) return "Anti-Diagonal";
  return "Line";
}

function statusColor(status: BingoGame["status"]) {
  switch (status) {
    case "REGISTRATION": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "ACTIVE": return "bg-green-500/20 text-green-300 border-green-500/30 animate-pulse";
    case "COMPLETED": return "bg-yellow-400/20 text-yellow-300 border-yellow-400/30";
    case "CANCELLED": return "bg-red-500/10 text-red-400 border-red-500/20";
    default: return "bg-white/8 text-white/40 border-white/10";
  }
}

function statusLabel(s: BingoGame["status"]) {
  const map: Record<BingoGame["status"], string> = {
    DRAFT: "Draft", REGISTRATION: "Open for Entry", ACTIVE: "Live",
    COMPLETED: "Completed", CANCELLED: "Cancelled",
  };
  return map[s];
}

// ─── Bingo Grid ───────────────────────────────────────────────────────────────

function BingoGrid({ game, currentUserId }: { game: BingoGame; currentUserId: string | null }) {
  const { cells, gridSize, currentCellId, lineWins } = game;

  // Build set of cells that are part of completed lines for highlight
  const wonCellKeys = new Set<string>();
  for (const lw of lineWins) {
    if (lw.lineType === "row") {
      for (let c = 0; c < gridSize; c++) wonCellKeys.add(`${lw.lineIndex}:${c}`);
    } else if (lw.lineType === "col") {
      for (let r = 0; r < gridSize; r++) wonCellKeys.add(`${r}:${lw.lineIndex}`);
    } else if (lw.lineType === "diag" && lw.lineIndex === 0) {
      for (let i = 0; i < gridSize; i++) wonCellKeys.add(`${i}:${i}`);
    } else if (lw.lineType === "diag" && lw.lineIndex === 1) {
      for (let i = 0; i < gridSize; i++) wonCellKeys.add(`${i}:${gridSize - 1 - i}`);
    }
  }

  const grid: BingoCell[][] = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => cells.find(cell => cell.row === r && cell.col === c)!)
  );

  const cellSize = gridSize === 3 ? "h-24 sm:h-28" : gridSize === 4 ? "h-20 sm:h-24" : "h-16 sm:h-20";

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const isActive = cell.id === currentCellId;
          const isWonLine = wonCellKeys.has(`${r}:${c}`);
          const isMyCell = cell.claimedById === currentUserId;

          let bg = "bg-white/5 border-white/10";
          if (cell.status === "GREEN") bg = isWonLine ? "bg-green-500/30 border-green-400/60" : "bg-green-500/20 border-green-500/30";
          else if (cell.status === "RED") bg = "bg-red-500/10 border-red-500/20";
          else if (isActive) bg = "bg-yellow-400/20 border-yellow-400/60 animate-pulse";

          return (
            <div
              key={cell.id}
              className={`relative flex flex-col items-center justify-center ${cellSize} rounded-xl border transition-all ${bg} ${isMyCell ? "ring-2 ring-yellow-400/50" : ""}`}
            >
              {/* Row/Col label at top */}
              {r === 0 && (
                <span className="absolute -top-5 left-0 right-0 text-center text-[10px] text-white/30 font-bold">
                  C{c + 1}
                </span>
              )}
              {c === 0 && (
                <span className="absolute -left-5 top-0 bottom-0 flex items-center text-[10px] text-white/30 font-bold">
                  R{r + 1}
                </span>
              )}

              {cell.status === "GREEN" && (
                <div className="flex flex-col items-center gap-1 p-1 text-center">
                  {cell.claimedBy?.avatarUrl ? (
                    <img src={cell.claimedBy.avatarUrl} alt="" className="w-7 h-7 rounded-full ring-1 ring-green-400/50" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">
                      {cell.claimedBy?.displayName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="text-green-300 text-[10px] leading-tight font-medium line-clamp-1 max-w-full px-1">
                    {cell.slotName ?? cell.claimedBy?.displayName ?? "Won"}
                  </span>
                </div>
              )}

              {cell.status === "RED" && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-red-400/70 text-xl">✕</span>
                  {cell.slotName && (
                    <span className="text-red-400/40 text-[9px] text-center line-clamp-1 px-1">{cell.slotName}</span>
                  )}
                </div>
              )}

              {cell.status === "ACTIVE" && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-yellow-300 text-xl animate-bounce">★</span>
                  {cell.slotName && (
                    <span className="text-yellow-300/80 text-[9px] text-center line-clamp-1 px-1">{cell.slotName}</span>
                  )}
                </div>
              )}

              {cell.status === "EMPTY" && (
                <span className="text-white/10 text-xs">{r * gridSize + c + 1}</span>
              )}

              {isWonLine && cell.status === "GREEN" && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-400/40 pointer-events-none" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Slot Select Modal (for selected viewer) ─────────────────────────────────

function SlotSelectModal({
  game, userId, onClose,
}: { game: BingoGame; userId: string; onClose: () => void }) {
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!slot.trim() || !game.currentCellId) return;
    setLoading(true);
    try {
      await bingoApi.setSlot(game.id, game.currentCellId, slot.trim());
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-yellow-400/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🎰</div>
          <h3 className="text-xl font-bold text-white">You&apos;ve been selected!</h3>
          <p className="text-white/50 text-sm mt-1">Pick your slot for the bingo square</p>
        </div>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <label className="block text-sm text-white/60 mb-1">Your slot / game</label>
        <div className="mb-4">
          <SlotPicker value={slot} onChange={setSlot} disabled={loading} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={!slot.trim() || loading}
            className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition-colors"
          >
            {loading ? "Saving…" : "Lock In Slot"}
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rules Modal ──────────────────────────────────────────────────────────────

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-green-500/20 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🟩</span>
            <h2 className="text-base font-bold text-white">How Bonus Bingo Works</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm text-white/70 leading-relaxed">
          <ol className="space-y-3">
            {[
              "Join the game during the registration phase",
              "A random square on the bingo board is selected",
              "A random viewer from the participant pool is picked",
              "The chosen viewer picks their slot/bonus game",
              "Matty plays that bonus live on stream",
              "If the bonus profits → the square turns green 🟩 and the viewer claims it",
              "If the bonus doesn't profit → the square turns red ✕",
              "First completed line (row, column, or diagonal) wins coins for all claimers!",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-green-400 font-bold shrink-0 w-4">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="bg-white/5 border border-white/8 rounded-xl p-4">
            <p className="text-white font-bold mb-2 text-xs uppercase tracking-widest">🎁 Rewards</p>
            <div className="flex flex-wrap gap-2">
              {["Website coins", "Giveaway entries", "Community rewards", "Special events"].map((r) => (
                <span key={r} className="bg-white/5 border border-white/10 text-white/60 text-xs px-3 py-1 rounded-lg">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BonusBingoPage() {
  const [user, setUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [games, setGames] = useState<BingoGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSlotSelect, setShowSlotSelect] = useState(false);

  const activeGame = games.find(g => g.status === "ACTIVE" || g.status === "REGISTRATION");
  const pastGames = games.filter(g => g.status === "COMPLETED" || g.status === "CANCELLED");

  const isParticipant = !!(activeGame && user && activeGame.participants.some(p => p.userId === user.id));
  const isSelectedPlayer = !!(activeGame && user && activeGame.currentUserId === user.id && activeGame.currentCellId);
  const hasSetSlot = !!(activeGame && activeGame.currentCellId &&
    activeGame.cells.find(c => c.id === activeGame.currentCellId)?.slotName);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const loadGames = useCallback(async () => {
    try {
      const data = await bingoApi.getAll();
      setGames(data);
    } catch { setError("Failed to load bingo games"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  // Socket subscription to active game
  useEffect(() => {
    if (!activeGame) return;
    const socket = getSocket();
    socket.emit("joinBingo", activeGame.id);
    socket.on("bingo:updated", (updated: BingoGame) => {
      setGames(prev => prev.map(g => g.id === updated.id ? updated : g));
    });
    return () => {
      socket.emit("leaveBingo", activeGame.id);
      socket.off("bingo:updated");
    };
  }, [activeGame?.id]);

  // Auto-open slot selector when this user is drawn
  useEffect(() => {
    if (isSelectedPlayer && !hasSetSlot) setShowSlotSelect(true);
  }, [isSelectedPlayer, hasSetSlot]);

  const handleJoin = async () => {
    if (!activeGame || !user) return;
    setActionLoading(true); setError(null);
    try { await bingoApi.join(activeGame.id); await loadGames(); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    if (!activeGame || !user) return;
    setActionLoading(true); setError(null);
    try { await bingoApi.leave(activeGame.id); await loadGames(); }
    catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400" />
    </div>
  );

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">

        {/* Back */}
        <div className="mb-8">
          <Link
            href="/stream-games"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Stream Games
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 leading-none">
            <span className="text-white">BONUS </span>
            <span style={{
              background: "linear-gradient(90deg, #4ade80 0%, #22c55e 40%, #16a34a 70%, #4ade80 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              BINGO
            </span>
          </h1>
          <p className="text-white/45 text-base sm:text-lg max-w-lg mx-auto">
            Complete a line on the bingo board to win coins. A wheel picks the square, a viewer picks the slot.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition-colors"
            >
              🎮 How to Play
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Active / Registration game */}
        {!activeGame ? (
          <div className="bg-white/3 border border-white/8 rounded-2xl px-8 py-14 text-center mb-14">
            <p className="text-5xl mb-4">🟩</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mb-3">No Active Game</p>
            <p className="text-white/50 text-base">Check back soon — the next Bonus Bingo will appear here when it goes live.</p>
          </div>
        ) : (
          <div className="mb-14 space-y-6">
            {/* Game header */}
            <div className="bg-white/3 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{activeGame.title}</h2>
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColor(activeGame.status)}`}>
                      {statusLabel(activeGame.status)}
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mt-1">
                    {activeGame.gridSize}×{activeGame.gridSize} grid · {activeGame.linePoints.toLocaleString()} coins per line · {activeGame.participants.length} participants
                  </p>
                </div>

                {/* Join / Leave */}
                {user && activeGame.status === "REGISTRATION" && (
                  isParticipant ? (
                    <button
                      onClick={handleLeave}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 text-sm font-medium transition-colors"
                    >
                      Leave Game
                    </button>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-400 disabled:opacity-40 text-sm transition-colors"
                    >
                      {actionLoading ? "Joining…" : "Join Game"}
                    </button>
                  )
                )}
                {!user && activeGame.status === "REGISTRATION" && (
                  <p className="text-white/40 text-sm">Login to join</p>
                )}
              </div>

              {/* Registration participant list */}
              {activeGame.status === "REGISTRATION" && activeGame.participants.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Participants ({activeGame.participants.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeGame.participants.map(p => (
                      <div key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${p.userId === user?.id ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-white/5 border-white/10 text-white/70"}`}>
                        {p.user.avatarUrl && <img src={p.user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />}
                        {p.user.displayName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected player banner */}
              {activeGame.status === "ACTIVE" && activeGame.currentUserId && (
                <div className="mb-4 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    {activeGame.currentUser?.avatarUrl && (
                      <img src={activeGame.currentUser.avatarUrl} alt="" className="w-10 h-10 rounded-full ring-2 ring-yellow-400/50" />
                    )}
                    <div>
                      <p className="text-yellow-300 font-bold">
                        {isSelectedPlayer ? "You've been selected! 🎉" : `${activeGame.currentUser?.displayName} is up!`}
                      </p>
                      <p className="text-white/50 text-sm mt-0.5">
                        {hasSetSlot
                          ? `Slot: ${activeGame.cells.find(c => c.id === activeGame.currentCellId)?.slotName}`
                          : isSelectedPlayer
                          ? "Pick your slot below!"
                          : "Waiting for them to pick their slot…"}
                      </p>
                    </div>
                    {isSelectedPlayer && !hasSetSlot && (
                      <button
                        onClick={() => setShowSlotSelect(true)}
                        className="ml-auto px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 text-sm shrink-0 transition-colors"
                      >
                        Pick Slot
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* No active cell info */}
              {activeGame.status === "ACTIVE" && !activeGame.currentCellId && (
                <div className="mb-4 p-3 bg-white/3 border border-white/8 rounded-xl text-center text-white/40 text-sm">
                  Waiting for the wheel to spin and select the next square…
                </div>
              )}

              {/* Bingo board */}
              {(activeGame.status === "ACTIVE" || activeGame.status === "COMPLETED") && (
                <div className="mt-2 overflow-x-auto">
                  <div className="pl-6 pt-6 inline-block min-w-full">
                    <BingoGrid game={activeGame} currentUserId={user?.id ?? null} />
                  </div>
                </div>
              )}

              {activeGame.status === "REGISTRATION" && (
                <div className="mt-4 p-4 bg-blue-500/8 border border-blue-500/20 rounded-xl text-center text-blue-300 text-sm">
                  Registration is open — join now to be in the pool for the bonus buys!
                </div>
              )}
            </div>

            {/* Line wins */}
            {activeGame.lineWins.length > 0 && (
              <div className="bg-white/3 border border-yellow-400/20 rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/70 mb-4">🏆 Completed Lines</p>
                <div className="space-y-2">
                  {activeGame.lineWins.map(lw => {
                    const lineKey = lw.lineType === "row"
                      ? { type: "row", idx: lw.lineIndex }
                      : lw.lineType === "col"
                      ? { type: "col", idx: lw.lineIndex }
                      : { type: "diag", idx: lw.lineIndex };

                    // Get winner names from cells
                    const winnerIds = new Set<string>();
                    const winnerNames: string[] = [];
                    for (const cell of activeGame.cells) {
                      let inLine = false;
                      if (lw.lineType === "row" && cell.row === lw.lineIndex && cell.status === "GREEN") inLine = true;
                      if (lw.lineType === "col" && cell.col === lw.lineIndex && cell.status === "GREEN") inLine = true;
                      if (lw.lineType === "diag" && lw.lineIndex === 0 && cell.row === cell.col && cell.status === "GREEN") inLine = true;
                      if (lw.lineType === "diag" && lw.lineIndex === 1 && cell.row + cell.col === activeGame.gridSize - 1 && cell.status === "GREEN") inLine = true;
                      if (inLine && cell.claimedById && !winnerIds.has(cell.claimedById)) {
                        winnerIds.add(cell.claimedById);
                        winnerNames.push(cell.claimedBy?.displayName ?? "?");
                      }
                    }

                    return (
                      <div key={lw.id} className="flex items-center justify-between gap-3 bg-yellow-400/8 border border-yellow-400/15 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-yellow-300 font-semibold text-sm">
                            🏆 {lineLabel(lw.lineType, lw.lineIndex, activeGame.gridSize)}
                          </p>
                          {winnerNames.length > 0 && (
                            <p className="text-white/50 text-xs mt-0.5">Winners: {winnerNames.join(", ")}</p>
                          )}
                        </div>
                        <span className="text-yellow-400 font-bold text-sm shrink-0">+{lw.pointsEach.toLocaleString()} coins each</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completion banner */}
            {activeGame.status === "COMPLETED" && (
              <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-400/25 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-green-400/70 mb-1">Game Complete!</p>
                <p className="text-white/60 text-sm">All squares have been played. Check Discord for reward delivery!</p>
              </div>
            )}
          </div>
        )}

        {/* Past games */}
        {pastGames.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">Recent Games</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pastGames.slice(0, 6).map(g => (
                <div key={g.id} className="bg-white/3 border border-white/8 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold">{g.title}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusColor(g.status)}`}>
                      {statusLabel(g.status)}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">
                    {g.gridSize}×{g.gridSize} · {g.lineWins.length} line{g.lineWins.length !== 1 ? "s" : ""} completed · {g.participants.length} players
                  </p>
                  {g.completedAt && (
                    <p className="text-white/25 text-xs mt-1">
                      {new Date(g.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showSlotSelect && activeGame && user && (
        <SlotSelectModal
          game={activeGame}
          userId={user.id}
          onClose={() => setShowSlotSelect(false)}
        />
      )}
    </div>
  );
}
