"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { pickerApi, ViewerPicker, PickerUser } from "@/lib/api/viewerPicker";
import RandomizerCannon from "@/components/viewerPicker/RandomizerCannon";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/admin/useConfirm";
import { Search, Download, Trash2, Play, Square, Users, ExternalLink, Plus } from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
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

  if (!authed || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredEntries = current
    ? current.entries.filter((e) => !search.trim() || e.user.displayName.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-[#05070d] pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-white font-black text-2xl tracking-wide">Viewer Picker</h1>
            <p className="text-gray-500 text-sm mt-0.5">Kick chat giveaways with the Randomizer Cannon</p>
          </div>
          <a
            href="/picker-widget" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> OBS Widget
          </a>
        </div>

        {!current ? (
          <div className="bg-[#0a0e17] border border-cyan-500/15 rounded-2xl p-6 mb-8">
            <h2 className="text-white font-bold text-sm mb-4">Start a New Giveaway</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Entry Keyword</label>
                <input
                  value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="!join"
                  className="w-full bg-[#0f1420] border border-cyan-500/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400/50"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Label (optional)</label>
                <input
                  value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="e.g. Friday Giveaway"
                  className="w-full bg-[#0f1420] border border-cyan-500/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Play className="w-4 h-4" /> {creating ? "Starting…" : "Start Giveaway"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            {/* Cannon + status */}
            <div className="space-y-4">
              <RandomizerCannon
                entries={current.entries}
                winner={pendingWinner}
                onRevealComplete={() => {}}
                onPickAnother={runDraw}
                onRemoveAndContinue={handleRemoveAndContinue}
                onReset={() => setPendingWinner(null)}
              />

              <div className="bg-[#0a0e17] border border-cyan-500/15 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-bold text-sm">{current.label || current.keyword}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Keyword: <span className="text-cyan-400 font-mono">{current.keyword}</span></p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                    current.status === "OPEN" ? "bg-green-500/20 text-green-400" :
                    current.status === "CLOSED" ? "bg-yellow-500/20 text-yellow-400" : "bg-cyan-500/20 text-cyan-400"
                  }`}>
                    {current.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <Users className="w-4 h-4" /> {current.entries.length} participant{current.entries.length !== 1 ? "s" : ""}
                </div>
                <div className="flex flex-wrap gap-2">
                  {current.status === "OPEN" && (
                    <button onClick={handleClose} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors">
                      <Square className="w-3.5 h-3.5" /> Close Entries
                    </button>
                  )}
                  <button
                    onClick={runDraw}
                    disabled={drawing || current.entries.length === 0}
                    className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-navy-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> {drawing ? "Drawing…" : "Start Winner Selection"}
                  </button>
                  <button onClick={handleExport} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <button onClick={handleClear} className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Clear Giveaway
                  </button>
                </div>
              </div>
            </div>

            {/* Participant list */}
            <div className="bg-[#0a0e17] border border-cyan-500/15 rounded-2xl p-5 flex flex-col">
              <h2 className="text-white font-bold text-sm mb-3">Participants</h2>

              {current.status === "OPEN" && (
                <div className="flex gap-2 mb-3">
                  <input
                    value={manualUsername} onChange={(e) => setManualUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd(); }}
                    placeholder="Add by Kick username…"
                    className="flex-1 bg-[#0f1420] border border-cyan-500/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400/50"
                  />
                  <button onClick={handleManualAdd} disabled={adding} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search participants…"
                  className="w-full pl-9 pr-3 py-2 bg-[#0f1420] border border-cyan-500/15 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              <div className="flex-1 overflow-y-auto max-h-96 space-y-1">
                {filteredEntries.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">No participants yet</p>
                ) : (
                  filteredEntries.map((e) => (
                    <div key={e.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/3">
                      {e.user.avatarUrl ? (
                        <img src={e.user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {e.user.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-200 text-sm flex-1 truncate">{e.user.displayName}</span>
                      <span className="text-gray-600 text-xs shrink-0">{timeAgo(e.enteredAt)}</span>
                      <button onClick={() => handleRemoveEntry(e.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Previous winners */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Previous Winners</p>
            <div className="space-y-2">
              {history.map((p) => (
                <div key={p.id} className="bg-[#0a0e17] border border-cyan-500/10 rounded-xl p-4">
                  <p className="text-gray-500 text-xs mb-2">{p.label || p.keyword} · {timeAgo(p.createdAt)}</p>
                  {p.winners.length === 0 ? (
                    <p className="text-gray-600 text-sm">No winner drawn</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {p.winners.map((w) => (
                        <span key={w.id} className="text-xs text-gray-300 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1">
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
      </div>
      {dialog}
    </div>
  );
}
