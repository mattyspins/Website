"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { bingoApi, BingoGame } from "@/lib/api/bonusBingo";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import SlotPicker from "@/components/SlotPicker";
import { kickName, lineLabel, getLineWinners } from "@/lib/bingoUtils";
import { useConfirm } from "@/components/admin/useConfirm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: BingoGame["status"]) {
  switch (s) {
    case "REGISTRATION": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "ACTIVE": return "bg-green-500/20 text-green-300 border-green-500/30";
    case "COMPLETED": return "bg-yellow-400/20 text-yellow-300 border-yellow-400/30";
    case "CANCELLED": return "bg-red-500/10 text-red-400 border-red-500/20";
    default: return "bg-white/8 text-white/40 border-white/10";
  }
}

// ─── Line Celebration Overlay ─────────────────────────────────────────────────

function LineCelebration({
  lineType, lineIndex, points, onDone,
}: { lineType: string; lineIndex: number; points: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const label = lineLabel(lineType, lineIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-3 bg-[#0f1a0f]/90 border border-green-400/40 rounded-2xl px-10 py-8 shadow-2xl shadow-green-900/40 animate-pop-in">
        <div className="text-5xl animate-bounce">🏆</div>
        <p className="text-green-300 font-black text-2xl tracking-tight">BINGO!</p>
        <p className="text-white font-semibold text-lg">{label} complete!</p>
        <p className="text-yellow-400 font-bold text-base">+{points.toLocaleString()} coins to all claimers</p>
        <button onClick={onDone} className="mt-1 text-white/30 hover:text-white/60 text-xs transition-colors">dismiss</button>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: BingoGame) => void }) {
  const [form, setForm] = useState({ title: "", gridSize: 5, linePoints: 500 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim()) { setError("Title required"); return; }
    setLoading(true); setError(null);
    try { onCreate(await bingoApi.create(form)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-5">Create Bonus Bingo Game</h3>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <label className="block text-sm text-white/60 mb-1">Title</label>
        <input
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white mb-5 focus:outline-none focus:border-green-400/50"
          placeholder="e.g. Friday Bingo #1"
        />

        <label className="block text-sm text-white/60 mb-2">Grid Size</label>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setForm({ ...form, gridSize: n })}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${form.gridSize === n ? "bg-green-500 text-white border-green-500" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"}`}
            >
              {n}×{n}
            </button>
          ))}
        </div>

        <label className="block text-sm text-white/60 mb-2">Coins per line win</label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[250, 500, 1000, 2500].map(n => (
            <button
              key={n}
              onClick={() => setForm({ ...form, linePoints: n })}
              className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${form.linePoints === n ? "bg-green-500 text-white border-green-500" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"}`}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-white/40 shrink-0">Custom:</span>
          <input
            type="number"
            min={1}
            value={form.linePoints}
            onChange={e => setForm({ ...form, linePoints: Number(e.target.value) })}
            className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-400/50"
          />
          <span className="text-xs text-white/40">coins</span>
        </div>

        <div className="flex gap-2">
          <button onClick={submit} disabled={loading}
            className="flex-1 bg-green-500 text-white font-semibold py-2.5 rounded-lg hover:bg-green-400 disabled:opacity-40 transition-colors">
            {loading ? "Creating…" : "Create Game"}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Bingo Grid ─────────────────────────────────────────────────────────

function AdminBingoGrid({
  game, onSetSlot, actionLoading,
}: { game: BingoGame; onSetSlot: (cellId: string, slot: string) => void; actionLoading: boolean }) {
  const { cells, gridSize, currentCellId, lineWins } = game;
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [slotInput, setSlotInput] = useState("");

  const wonCellKeys = new Set<string>();
  for (const lw of lineWins) {
    if (lw.lineType === "row") for (let c = 0; c < gridSize; c++) wonCellKeys.add(`${lw.lineIndex}:${c}`);
    else if (lw.lineType === "col") for (let r = 0; r < gridSize; r++) wonCellKeys.add(`${r}:${lw.lineIndex}`);
    else if (lw.lineType === "diag" && lw.lineIndex === 0) for (let i = 0; i < gridSize; i++) wonCellKeys.add(`${i}:${i}`);
    else if (lw.lineType === "diag" && lw.lineIndex === 1) for (let i = 0; i < gridSize; i++) wonCellKeys.add(`${i}:${gridSize - 1 - i}`);
  }

  const grid = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => cells.find(cell => cell.row === r && cell.col === c)!)
  );


  return (
    <>
      <div
        className="grid gap-1.5 max-w-lg mx-auto"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const isActive = cell.id === currentCellId;
            const isWonLine = wonCellKeys.has(`${r}:${c}`);

            let bg = "bg-white/5 border-white/10";
            if (cell.status === "GREEN") bg = isWonLine ? "bg-green-500/30 border-green-400/60" : "bg-green-500/20 border-green-500/30";
            else if (isActive) bg = "bg-yellow-400/20 border-yellow-400/60 animate-pulse";

            return (
              <div
                key={cell.id}
                onClick={() => {
                  if (isActive && !cell.slotName) {
                    setEditingCell(cell.id);
                    setSlotInput(cell.slotName ?? "");
                  }
                }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border transition-all ${bg} ${isActive && !cell.slotName ? "cursor-pointer hover:brightness-110" : ""}`}
              >
                {cell.status === "GREEN" && (
                  <div className="flex flex-col items-center gap-0.5 p-1 text-center">
                    {cell.claimedBy?.avatarUrl ? (
                      <img src={cell.claimedBy.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-[10px] font-bold">
                        {kickName(cell.claimedBy)[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    {cell.claimedBy && (
                      <span className="text-green-200 text-[9px] font-semibold line-clamp-1 px-0.5 leading-tight">{kickName(cell.claimedBy)}</span>
                    )}
                    {cell.slotName && (
                      <span className="text-green-400/60 text-[8px] line-clamp-1 px-0.5 leading-tight">{cell.slotName}</span>
                    )}
                  </div>
                )}
                {cell.status === "ACTIVE" && (
                  <div className="flex flex-col items-center gap-0.5 text-center p-1">
                    <span className="text-yellow-300 text-lg animate-bounce">★</span>
                    {cell.slotName
                      ? <span className="text-yellow-300/80 text-[9px] line-clamp-1 px-0.5">{cell.slotName}</span>
                      : <span className="text-white/30 text-[9px]">tap to set slot</span>
                    }
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

      {/* Inline slot editor for active cell */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-yellow-400/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-4">Set Slot for Active Cell</h3>
            <SlotPicker value={slotInput} onChange={setSlotInput} disabled={actionLoading} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { onSetSlot(editingCell, slotInput); setEditingCell(null); }}
                disabled={!slotInput.trim() || actionLoading}
                className="flex-1 bg-yellow-400 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition-colors"
              >
                Save
              </button>
              <button onClick={() => setEditingCell(null)} className="px-4 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminBingoPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [games, setGames] = useState<BingoGame[]>([]);
  const [selected, setSelected] = useState<BingoGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [lineAlert, setLineAlert] = useState<{ lineType: string; lineIndex: number; points: number } | null>(null);
  const [includeWinners, setIncludeWinners] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!d.user?.isAdmin) router.push("/"); else setAuthLoading(false); })
      .catch(() => router.push("/"));
  }, []);

  const loadGames = useCallback(async () => {
    try {
      const data = await bingoApi.getAll();
      setGames(data);
      if (!selected && data.length > 0) setSelected(data[0]);
    } catch { setError("Failed to load bingo games"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  // Socket: keep selected game in sync
  useEffect(() => {
    if (!selected) return;
    const socket = getSocket();
    socket.emit("joinBingo", selected.id);
    const handleBingoUpdate = (updated: BingoGame) => {
      if (updated.id === selected.id) setSelected(updated);
      setGames(prev => prev.map(g => g.id === updated.id ? updated : g));
    };
    socket.on("bingo:updated", handleBingoUpdate);
    return () => { socket.emit("leaveBingo", selected.id); socket.off("bingo:updated", handleBingoUpdate); };
  }, [selected?.id]);

  const withAction = async (fn: () => Promise<BingoGame>) => {
    setActionLoading(true); setError(null);
    try {
      const updated = await fn();
      setSelected(updated);
      setGames(prev => prev.map(g => g.id === updated.id ? updated : g));
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleOpenReg = () => withAction(() => bingoApi.openRegistration(selected!.id));
  const handleStart = () => withAction(() => bingoApi.startGame(selected!.id));
  const handleSpin = () => withAction(() => bingoApi.spinCell(selected!.id));
  const handleDraw = () => withAction(() => bingoApi.drawPlayer(selected!.id, includeWinners));
  const handleResult = async (won: boolean) => {
    if (!(await confirm({
      title: won ? "Mark bonus as WON?" : "Mark bonus as LOST?",
      message: won ? "The cell will turn green." : "The cell resets and can be spun again.",
      confirmText: "Confirm",
      confirmColor: won ? "green" : "yellow",
    }))) return;
    setActionLoading(true); setError(null);
    bingoApi.markResult(selected!.id, won)
      .then(({ game, newLineWins }) => {
        setSelected(game);
        setGames(prev => prev.map(g => g.id === game.id ? game : g));
        if (newLineWins.length > 0) {
          const newest = newLineWins[newLineWins.length - 1];
          setLineAlert({ lineType: newest.lineType, lineIndex: newest.lineIndex, points: game.linePoints });
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setActionLoading(false));
  };
  const handleComplete = async () => {
    if (!(await confirm({ title: "Complete this game?", message: "It will move to Past Games on the viewer page. This cannot be undone.", confirmText: "Complete Game" }))) return;
    withAction(() => bingoApi.completeGame(selected!.id));
  };
  const handleUnlive = async () => {
    if (!(await confirm({ title: "Revert to Registration?", message: "The current active cell will be reset and the draw cycle cleared.", confirmText: "Revert", confirmColor: "yellow" }))) return;
    withAction(() => bingoApi.unlive(selected!.id));
  };
  const handleCancel = async () => {
    if (!(await confirm({ title: "Cancel this bingo game?", message: "This cannot be undone.", confirmText: "Cancel Game" }))) return;
    withAction(() => bingoApi.cancel(selected!.id));
  };
  const handleRemoveParticipant = async (userId: string, name: string) => {
    if (!(await confirm({ title: "Remove participant?", message: `Remove ${name} from the game?`, confirmText: "Remove" }))) return;
    withAction(() => bingoApi.removeParticipant(selected!.id, userId));
  };
  const handleDelete = async (id: string, title: string) => {
    if (!(await confirm({ title: "Delete this game?", message: `Delete "${title}" permanently? This cannot be undone.`, confirmText: "Delete" }))) return;
    setActionLoading(true); setError(null);
    try {
      await bingoApi.deleteGame(id);
      const remaining = games.filter(g => g.id !== id);
      setGames(remaining);
      setSelected(remaining[0] ?? null);
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };
  const handleSetSlot = (cellId: string, slotName: string) =>
    withAction(() => bingoApi.setSlot(selected!.id, cellId, slotName));

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400" />
    </div>
  );

  const activeCell = selected?.cells.find(c => c.id === selected.currentCellId);
  const canSpin = selected?.status === "ACTIVE" && !selected.currentCellId;
  const canDraw = selected?.status === "ACTIVE" && !!selected.currentCellId && !selected.currentUserId;
  const canResult = selected?.status === "ACTIVE" && !!selected.currentCellId;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Bonus Bingo Admin</h1>
            <p className="text-white/40 text-sm mt-0.5">Create and run bonus bingo sessions</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 transition-colors text-sm"
          >
            + New Game
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Game list */}
        <div className="space-y-2 mb-6">
          {games.map(g => {
            const isActive = selected?.id === g.id;
            return (
              <div
                key={g.id}
                onClick={() => setSelected(g)}
                className={`cursor-pointer rounded-xl border transition-all ${isActive ? "border-green-400/40 bg-green-400/5" : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.status === "ACTIVE" || g.status === "REGISTRATION" ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
                    <span className="font-semibold text-white text-sm">{g.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusColor(g.status)}`}>
                      {g.status.replace("_", " ")}
                    </span>
                    <span className="text-white/30 text-xs">{g.gridSize}×{g.gridSize}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/35">
                    <span>{g.participants.length} players</span>
                    <span>{g.lineWins.length} lines won</span>
                    {isActive && <span className="text-green-400 text-sm">▾</span>}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(g.id, g.title); }}
                      disabled={actionLoading}
                      className="ml-1 px-2 py-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-30"
                    >🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
          {games.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-3">🟩</div>
              <p className="text-lg">No bingo games yet</p>
              <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2.5 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 transition-colors text-sm">
                Create First Game
              </button>
            </div>
          )}
        </div>

        {selected && (
          <div className="space-y-6">
            {/* Control panel */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                  <p className="text-sm text-white/40 mt-0.5">
                    {selected.gridSize}×{selected.gridSize} · {selected.linePoints.toLocaleString()} coins/line · {selected.participants.length} participants
                  </p>
                </div>

                {/* Phase buttons */}
                <div className="flex gap-2 flex-wrap items-center">
                  <a
                    href="/bingo-widget"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open OBS widget"
                    className="px-3 py-2 border border-purple-500/40 text-purple-300 rounded-lg hover:bg-purple-500/10 transition-colors text-sm flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                    OBS Widget
                  </a>
                  <button
                    onClick={() => setIncludeWinners(v => !v)}
                    title={includeWinners ? "Winners are included in the draw pool — click to exclude them" : "Winners are excluded from the draw pool — click to include them"}
                    className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                      includeWinners
                        ? "border-green-500/50 text-green-300 bg-green-500/10 hover:bg-green-500/20"
                        : "border-white/10 text-white/40 hover:bg-white/5"
                    }`}
                  >
                    🏆 {includeWinners ? "Winners in pool" : "Winners excluded"}
                  </button>
                  {selected.status === "DRAFT" && (
                    <button onClick={handleOpenReg} disabled={actionLoading}
                      className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-400 disabled:opacity-40 transition-colors text-sm">
                      Open Registration
                    </button>
                  )}
                  {selected.status === "REGISTRATION" && (
                    <button onClick={handleStart} disabled={actionLoading || selected.participants.length < 1}
                      className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 disabled:opacity-40 transition-colors text-sm">
                      Start Game
                    </button>
                  )}
                  {selected.status === "ACTIVE" && (
                    <button onClick={handleUnlive} disabled={actionLoading}
                      className="px-4 py-2 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/10 disabled:opacity-40 transition-colors text-sm">
                      ↩ Unlive
                    </button>
                  )}
                  {!["COMPLETED", "CANCELLED"].includes(selected.status) && (
                    <button onClick={handleComplete} disabled={actionLoading}
                      className="px-4 py-2 border border-yellow-500/40 text-yellow-400 rounded-lg hover:bg-yellow-500/10 disabled:opacity-40 transition-colors text-sm">
                      ✓ End Game
                    </button>
                  )}
                  {!["COMPLETED", "CANCELLED"].includes(selected.status) && (
                    <button onClick={handleCancel} disabled={actionLoading}
                      className="px-4 py-2 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-40 transition-colors text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Participant list — always visible, admin can remove */}
              {!["COMPLETED", "CANCELLED"].includes(selected.status) && (
                <div className="mb-4">
                  <p className="text-sm text-white/50 mb-3 font-medium">
                    Participants ({selected.participants.length})
                  </p>
                  {selected.participants.length === 0 ? (
                    <p className="text-white/30 text-sm">No participants yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selected.participants.map(p => {
                        const hasGreenCell = selected.cells.some(
                          c => c.status === "GREEN" && c.claimedById === p.userId
                        );
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg text-sm border ${
                              hasGreenCell
                                ? "bg-green-500/10 border-green-500/25 text-green-300"
                                : "bg-white/5 border-white/10 text-white/80"
                            }`}
                          >
                            {p.user.avatarUrl && <img src={p.user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />}
                            <span>{kickName(p.user)}</span>
                            {p.preferredSlot && <span className="text-white/40 text-xs">🎰 {p.preferredSlot}</span>}
                            {hasGreenCell && <span className="text-green-400 text-xs">🟩</span>}
                            <button
                              onClick={() => handleRemoveParticipant(p.userId, kickName(p.user))}
                              disabled={actionLoading}
                              title="Remove participant"
                              className="ml-1 text-white/20 hover:text-red-400 transition-colors disabled:opacity-30 text-xs leading-none"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Active game controls */}
              {selected.status === "ACTIVE" && (
                <div className="space-y-4">
                  {/* Current round status */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-3">Current Round</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Step 1: Spin */}
                      <div className={`p-3 rounded-xl border ${canSpin ? "border-yellow-400/30 bg-yellow-400/8" : selected.currentCellId ? "border-green-500/20 bg-green-500/5" : "border-white/8 bg-white/3"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Step 1</p>
                        <p className="text-sm font-semibold text-white mb-2">
                          {selected.currentCellId
                            ? `Cell: Row ${(activeCell?.row ?? 0) + 1}, Col ${(activeCell?.col ?? 0) + 1}`
                            : "Spin the wheel"}
                        </p>
                        <button
                          onClick={handleSpin}
                          disabled={!canSpin || actionLoading}
                          className="w-full py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm transition-colors"
                        >
                          {selected.currentCellId ? "✓ Cell Selected" : "🎲 Spin Cell"}
                        </button>
                      </div>

                      {/* Step 2: Draw player */}
                      <div className={`p-3 rounded-xl border ${canDraw ? "border-yellow-400/30 bg-yellow-400/8" : selected.currentUserId ? "border-green-500/20 bg-green-500/5" : "border-white/8 bg-white/3"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Step 2</p>
                        <p className="text-sm font-semibold text-white mb-2">
                          {selected.currentUserId
                            ? kickName(selected.currentUser)
                            : "Draw a viewer"}
                        </p>
                        <button
                          onClick={handleDraw}
                          disabled={!canDraw || actionLoading}
                          className="w-full py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm transition-colors"
                        >
                          {selected.currentUserId ? "✓ Viewer Drawn" : "👤 Draw Player"}
                        </button>
                      </div>

                      {/* Step 3: Result */}
                      <div className={`p-3 rounded-xl border ${canResult && selected.currentUserId ? "border-yellow-400/30 bg-yellow-400/8" : "border-white/8 bg-white/3"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Step 3</p>
                        <p className="text-sm font-semibold text-white mb-2">
                          {activeCell?.slotName ? `Slot: ${activeCell.slotName}` : "Mark result"}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleResult(true)}
                            disabled={!canResult || actionLoading}
                            className="py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 disabled:opacity-40 text-xs transition-colors"
                          >
                            🟩 Won
                          </button>
                          <button
                            onClick={() => handleResult(false)}
                            disabled={!canResult || actionLoading}
                            className="py-2 bg-red-500/60 text-white font-semibold rounded-lg hover:bg-red-500/80 disabled:opacity-40 text-xs transition-colors"
                          >
                            ✕ Lost
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slot name display */}
                  {activeCell && !activeCell.slotName && selected.currentUserId && (
                    <div className="p-3 bg-yellow-400/8 border border-yellow-400/20 rounded-xl text-yellow-300 text-sm">
                      Waiting for {kickName(selected.currentUser)} to pick their slot on the viewer page…
                      <br />
                      <span className="text-white/40 text-xs">Or click the active cell on the board below to set it manually.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Board */}
            {(selected.status === "ACTIVE" || selected.status === "COMPLETED") && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-white">Board — {selected.gridSize}×{selected.gridSize}</h3>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/40 border border-green-500/30 inline-block" /> Won</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400/20 border border-yellow-400/60 inline-block animate-pulse" /> Active</span>
                  </div>
                </div>
                <AdminBingoGrid game={selected} onSetSlot={handleSetSlot} actionLoading={actionLoading} />
              </div>
            )}

            {/* Line wins summary */}
            {selected.lineWins.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">🏆 Completed Lines</h3>
                <div className="space-y-2">
                  {selected.lineWins.map(lw => {
                    const winnerNames = getLineWinners(selected.cells, lw, selected.gridSize);

                    return (
                      <div key={lw.id} className="flex items-center justify-between gap-3 bg-yellow-400/8 border border-yellow-400/15 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-yellow-300 font-semibold text-sm">{lineLabel(lw.lineType, lw.lineIndex)}</p>
                          <p className="text-white/50 text-xs mt-0.5">
                            {winnerNames.length > 0 ? `Winners: ${winnerNames.join(", ")}` : "No claimers"}
                          </p>
                        </div>
                        <span className="text-yellow-400 font-bold text-sm shrink-0">+{lw.pointsEach.toLocaleString()} coins each</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed banner */}
            {selected.status === "COMPLETED" && (
              <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-400/25 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-green-400/70 mb-1">Game Complete</p>
                <p className="text-white/50 text-sm">All squares played — {selected.lineWins.length} line{selected.lineWins.length !== 1 ? "s" : ""} completed.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={g => { setGames(prev => [g, ...prev]); setSelected(g); setShowCreate(false); }}
        />
      )}

      {lineAlert && (
        <LineCelebration
          lineType={lineAlert.lineType}
          lineIndex={lineAlert.lineIndex}
          points={lineAlert.points}
          onDone={() => setLineAlert(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
}
