"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { isAuthenticated } from "@/lib/authPersistence";
import { authFetch } from "@/lib/authFetch";
import { getSocket } from "@/lib/socket";
import { pickerApi, ViewerPicker, PickerUser } from "@/lib/api/viewerPicker";
import RandomizerCannon from "@/components/viewerPicker/RandomizerCannon";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/admin/useConfirm";
import { Search, Download, Trash2, Play, Square, ExternalLink, Plus, Maximize, Minimize, Trophy } from "lucide-react";

const KICK_CHANNEL = "mattyspinsslots";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

const cardStyle: CSSProperties = {
  background: "rgba(28,30,46,0.55)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(140,200,255,0.14)",
  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
};

export default function AdminViewerPickerPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { confirm, dialog } = useConfirm();
  const [authed, setAuthed] = useState(false);

  const [current, setCurrent] = useState<ViewerPicker | null>(null);
  const [history, setHistory] = useState<ViewerPicker[]>([]);
  const [loading, setLoading] = useState(true);

  const [keywordInput, setKeywordInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [adding, setAdding] = useState(false);

  const [drawing, setDrawing] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<PickerUser | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/"); return; }
    authFetch(API_ENDPOINTS.AUTH_ME)
      .then((r) => r.json())
      .then((d) => { if (!d.user?.isAdmin) router.push("/"); else setAuthed(true); })
      .catch(() => router.push("/"));
  }, [router]);

  const loadHistory = useCallback(async () => {
    try {
      const all = await pickerApi.getAll();
      setHistory(all.filter((p) => p.status !== "OPEN"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const active = await pickerApi.getActive();
        setCurrent(active);
      } catch { /* ignore */ }
      await loadHistory();
      setLoading(false);
    })();
  }, [authed, loadHistory]);

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, [authed, loadHistory]);

  useEffect(() => {
    if (!authed || !current) return;
    const socket = getSocket();
    socket.emit("joinPicker", current.id);
    const onUpdate = (updated: ViewerPicker) => {
      setCurrent((prev) => (prev && updated.id === prev.id ? updated : prev));
    };
    socket.on("picker:updated", onUpdate);
    return () => {
      socket.emit("leavePicker", current.id);
      socket.off("picker:updated", onUpdate);
    };
  }, [authed, current?.id]);

  // Live "time running" readout
  useEffect(() => {
    if (!current) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [current?.id]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const handleCreate = async () => {
    if (!keywordInput.trim()) { error("Keyword required", "Enter an entry keyword, e.g. !join"); return; }
    setCreating(true);
    try {
      const picker = await pickerApi.create(keywordInput.trim(), labelInput.trim() || undefined);
      setCurrent(picker);
      setKeywordInput(""); setLabelInput("");
      success("Giveaway started", `Viewers can now type "${picker.keyword}" in chat to enter.`);
    } catch (e: any) {
      error("Failed", e.message || "Could not start giveaway.");
    } finally { setCreating(false); }
  };

  const handleClose = async () => {
    if (!current) return;
    try {
      const updated = await pickerApi.close(current.id);
      setCurrent(updated);
      success("Entries closed", "No more viewers can join this giveaway.");
    } catch (e: any) { error("Failed", e.message); }
  };

  const runDraw = async () => {
    if (!current) return;
    setDrawing(true);
    try {
      const updated = await pickerApi.draw(current.id);
      setCurrent(updated);
      setPendingWinner(updated.winner);
    } catch (e: any) {
      error("Draw failed", e.message || "Could not draw a winner.");
    } finally { setDrawing(false); }
  };

  const handleRemoveAndContinue = async (userId: string) => {
    if (!current) return;
    const entry = current.entries.find((e) => e.userId === userId);
    if (entry) {
      try {
        const updated = await pickerApi.removeEntry(entry.id);
        if (updated) setCurrent(updated);
      } catch { /* ignore */ }
    }
    await runDraw();
  };

  const handleRemoveEntry = async (entryId: string) => {
    try {
      const updated = await pickerApi.removeEntry(entryId);
      if (updated) setCurrent(updated);
    } catch (e: any) { error("Failed", e.message || "Could not remove participant."); }
  };

  const handleManualAdd = async () => {
    if (!current || !manualUsername.trim()) return;
    setAdding(true);
    try {
      const updated = await pickerApi.addEntry(current.id, manualUsername.trim());
      setCurrent(updated);
      setManualUsername("");
    } catch (e: any) {
      error("Failed", e.message || "Could not add participant.");
    } finally { setAdding(false); }
  };

  const handleClear = async () => {
    if (!current) return;
    if (!(await confirm({ title: "Clear this giveaway?", message: "This permanently deletes all entries. This cannot be undone.", confirmText: "Clear Giveaway" }))) return;
    try {
      await pickerApi.delete(current.id);
      setCurrent(null);
      setPendingWinner(null);
      await loadHistory();
      success("Giveaway cleared", "");
    } catch (e: any) { error("Failed", e.message); }
  };

  const handleExport = async () => {
    if (!current) return;
    try {
      await pickerApi.exportParticipants(current.id);
    } catch { error("Export failed", "Could not export participants."); }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!(await confirm({ title: "Delete this giveaway?", message: "This permanently deletes it and its entries. This cannot be undone.", confirmText: "Delete" }))) return;
    try {
      await pickerApi.delete(id);
      setHistory((prev) => prev.filter((p) => p.id !== id));
      success("Deleted", "");
    } catch (e: any) { error("Failed", e.message || "Could not delete."); }
  };

  if (!authed || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.13 0.025 265)" }}>
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredEntries = current
    ? current.entries.filter((e) => !search.trim() || e.user.displayName.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  const elapsedMs = current ? now - new Date(current.createdAt).getTime() : 0;

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.13 0.025 265)", color: "oklch(0.95 0.01 260)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 sm:px-7 py-3.5 flex-wrap"
        style={{ background: "rgba(18,20,32,0.55)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(120,200,255,0.14)" }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 200), oklch(0.62 0.19 300))", boxShadow: "0 0 18px rgba(110,200,255,0.5)" }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white" style={{ boxShadow: "0 0 10px 3px rgba(255,255,255,0.8)" }} />
          </div>
          <div>
            <div className="font-gaming text-lg font-extrabold tracking-wide leading-none">
              RANDOMIZER <span style={{ color: "oklch(0.78 0.16 200)" }}>CANNON</span>
            </div>
            <div className="text-[11px] tracking-[2px] mt-0.5" style={{ color: "oklch(0.6 0.02 260)" }}>KICK GIVEAWAY ENGINE</div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
            style={{
              background: current?.status === "OPEN" ? "rgba(90,240,170,0.12)" : "rgba(255,255,255,0.06)",
              color: current?.status === "OPEN" ? "oklch(0.78 0.16 150)" : "oklch(0.65 0.02 260)",
              border: `1px solid ${current?.status === "OPEN" ? "rgba(90,240,170,0.3)" : "rgba(255,255,255,0.15)"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: current?.status === "OPEN" ? "oklch(0.75 0.17 150)" : "oklch(0.5 0.02 260)" }}
            />
            {current?.status === "OPEN" ? "Chat: Listening" : "Chat: Idle"}
          </div>
          <a
            href="/picker-widget" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 font-gaming font-bold text-xs px-3.5 py-2 rounded-lg transition-colors"
            style={{ background: "rgba(120,200,255,0.1)", border: "1px solid rgba(120,200,255,0.3)", color: "oklch(0.82 0.1 200)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> OBS WIDGET
          </a>
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "oklch(0.85 0.02 260)" }}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4 sm:p-5">
        {/* Sidebar */}
        <div className="w-full lg:w-[400px] lg:shrink-0 flex flex-col gap-4">
          {/* Settings card */}
          <div className="rounded-[18px] p-5" style={cardStyle}>
            <div className="font-gaming text-[15px] font-bold tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-[3px] inline-block" style={{ background: "linear-gradient(180deg, oklch(0.75 0.17 200), oklch(0.65 0.19 300))" }} />
              GIVEAWAY SETTINGS
            </div>

            {!current ? (
              <>
                <div className="mb-3.5">
                  <div className="text-[12px] tracking-wide mb-1.5" style={{ color: "oklch(0.6 0.02 260)" }}>ENTRY KEYWORD</div>
                  <input
                    value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="!join"
                    className="w-full px-3.5 py-2.5 rounded-[10px] text-white text-[15px] font-semibold outline-none"
                    style={{ background: "rgba(10,12,20,0.6)", border: "1px solid rgba(140,200,255,0.2)" }}
                  />
                </div>
                <div className="mb-4">
                  <div className="text-[12px] tracking-wide mb-1.5" style={{ color: "oklch(0.6 0.02 260)" }}>LABEL (OPTIONAL)</div>
                  <input
                    value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="e.g. Friday Giveaway"
                    className="w-full px-3.5 py-2.5 rounded-[10px] text-white text-[15px] outline-none"
                    style={{ background: "rgba(10,12,20,0.6)", border: "1px solid rgba(140,200,255,0.2)" }}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full py-3 rounded-xl font-gaming font-bold text-sm tracking-wide text-white transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 200), oklch(0.62 0.19 300))", boxShadow: "0 0 22px rgba(120,200,255,0.4)" }}
                >
                  {creating ? "STARTING…" : "START COLLECTING ENTRIES"}
                </button>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-white font-bold text-sm">{current.label || current.keyword}</p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.6 0.02 260)" }}>
                    Keyword: <span className="font-mono" style={{ color: "oklch(0.78 0.16 200)" }}>{current.keyword}</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <div className="rounded-[10px] p-2.5 text-center" style={{ background: "rgba(10,12,20,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] tracking-wide mb-1" style={{ color: "oklch(0.55 0.02 260)" }}>STATUS</div>
                    <div className="font-gaming text-[13px] font-bold" style={{ color: current.status === "OPEN" ? "oklch(0.75 0.17 150)" : "oklch(0.6 0.02 260)" }}>
                      {current.status}
                    </div>
                  </div>
                  <div className="rounded-[10px] p-2.5 text-center" style={{ background: "rgba(10,12,20,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] tracking-wide mb-1" style={{ color: "oklch(0.55 0.02 260)" }}>ELIGIBLE</div>
                    <div className="font-gaming text-[13px] font-bold" style={{ color: "oklch(0.85 0.02 260)" }}>{current.entries.length}</div>
                  </div>
                  <div className="rounded-[10px] p-2.5 text-center" style={{ background: "rgba(10,12,20,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] tracking-wide mb-1" style={{ color: "oklch(0.55 0.02 260)" }}>TIME</div>
                    <div className="font-gaming text-[13px] font-bold" style={{ color: "oklch(0.85 0.02 260)" }}>{fmtElapsed(elapsedMs)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {current.status === "OPEN" && (
                    <button
                      onClick={handleClose}
                      className="flex items-center gap-1.5 font-gaming font-bold text-[11px] px-3 py-2 rounded-lg text-white/85 transition-colors"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}
                    >
                      <Square className="w-3.5 h-3.5" /> STOP ENTRIES
                    </button>
                  )}
                  <button
                    onClick={runDraw}
                    disabled={drawing || current.entries.length === 0}
                    className="flex items-center gap-1.5 font-gaming font-bold text-[11px] px-3 py-2 rounded-lg text-white transition-opacity disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 200), oklch(0.62 0.19 300))", boxShadow: "0 0 20px rgba(120,200,255,0.4)" }}
                  >
                    <Play className="w-3.5 h-3.5" /> {drawing ? "DRAWING…" : "LAUNCH WINNER"}
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 font-gaming font-bold text-[11px] px-3 py-2 rounded-lg text-white/85 transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}
                  >
                    <Download className="w-3.5 h-3.5" /> EXPORT
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1.5 font-gaming font-bold text-[11px] px-3 py-2 rounded-lg transition-colors"
                    style={{ background: "rgba(255,120,120,0.08)", border: "1px solid rgba(255,120,120,0.3)", color: "oklch(0.75 0.15 25)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> CLEAR
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Participants card */}
          <div className="flex-1 min-h-0 flex flex-col rounded-[18px] p-4.5" style={{ ...cardStyle, padding: "18px 20px" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-gaming text-sm font-bold tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-[3px] inline-block" style={{ background: "linear-gradient(180deg, oklch(0.75 0.17 150), oklch(0.7 0.15 200))" }} />
                PARTICIPANTS
              </div>
              <div
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(90,240,170,0.12)", color: "oklch(0.78 0.16 150)", border: "1px solid rgba(90,240,170,0.3)" }}
              >
                {current?.entries.length ?? 0}
              </div>
            </div>

            {current && current.status === "OPEN" && (
              <div className="flex gap-2 mb-3">
                <input
                  value={manualUsername} onChange={(e) => setManualUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd(); }}
                  placeholder="Add by Kick username…"
                  className="flex-1 rounded-lg px-3 py-2 text-white text-sm outline-none"
                  style={{ background: "rgba(10,12,20,0.6)", border: "1px solid rgba(140,200,255,0.16)" }}
                />
                <button
                  onClick={handleManualAdd}
                  disabled={adding}
                  className="flex items-center gap-1 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "oklch(0.5 0.02 260)" }} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search participants…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-white text-sm outline-none"
                style={{ background: "rgba(10,12,20,0.6)", border: "1px solid rgba(140,200,255,0.16)" }}
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-1 pr-0.5">
              {!current || filteredEntries.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: "oklch(0.5 0.02 260)" }}>
                  No entries yet — start collecting to see participants live.
                </p>
              ) : (
                filteredEntries
                  .slice()
                  .sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime())
                  .map((e) => (
                    <div key={e.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[11px] transition-colors hover:bg-white/[0.03]">
                      {e.user.avatarUrl ? (
                        <img src={e.user.avatarUrl} alt="" className="w-[34px] h-[34px] rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, oklch(0.7 0.17 200), oklch(0.55 0.14 220))" }}
                        >
                          {e.user.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/90 truncate">{e.user.displayName}</div>
                        <div className="text-[11px]" style={{ color: "oklch(0.55 0.02 260)" }}>{timeAgo(e.enteredAt)}</div>
                      </div>
                      <button onClick={() => handleRemoveEntry(e.id)} className="shrink-0 transition-colors" style={{ color: "oklch(0.5 0.02 260)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Stage */}
        <div className="flex-1 min-w-0">
          <RandomizerCannon
            entries={current?.entries ?? []}
            winner={pendingWinner}
            onRevealComplete={() => {}}
            onPickAnother={runDraw}
            onRemoveAndContinue={handleRemoveAndContinue}
            onReset={() => setPendingWinner(null)}
          />
        </div>
      </div>

      {/* Previous winners */}
      {history.length > 0 && (
        <div className="px-4 sm:px-5 pb-12 max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "oklch(0.6 0.02 260)" }}>
            <Trophy className="w-3.5 h-3.5" /> Previous Winners
          </p>
          <div className="space-y-2">
            {history.map((p) => (
              <div key={p.id} className="rounded-xl p-4" style={{ background: "rgba(10,12,20,0.5)", border: "1px solid rgba(140,200,255,0.1)" }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs" style={{ color: "oklch(0.55 0.02 260)" }}>{p.label || p.keyword} · {timeAgo(p.createdAt)}</p>
                  <button
                    onClick={() => handleDeleteHistoryItem(p.id)}
                    title="Delete this giveaway"
                    className="shrink-0 transition-colors"
                    style={{ color: "oklch(0.5 0.02 260)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {p.winners.length === 0 ? (
                  <p className="text-sm" style={{ color: "oklch(0.5 0.02 260)" }}>No winner drawn</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {p.winners.map((w) => (
                      <span key={w.id} className="text-xs text-gray-200 rounded-lg px-2.5 py-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {w.user.displayName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
