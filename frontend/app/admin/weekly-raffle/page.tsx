"use client";

import { useCallback, useEffect, useState } from "react";
import {
  weeklyRaffleApi,
  WeeklyRaffle,
  WeeklyRaffleParticipant,
  WeeklyRaffleDrawResult,
  WeeklyRaffleUserSearchResult,
} from "@/lib/api/weeklyRaffle";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/admin/useConfirm";
import { isoWeekNumber } from "@/lib/weekNumber";
import EliminationReveal from "@/components/weeklyRaffle/EliminationReveal";
import { Users, Play, Plus, Trophy, Pencil, X, Search, UserPlus } from "lucide-react";

export default function AdminWeeklyRafflePage() {
  const { success, error } = useToast();
  const { confirm, dialog } = useConfirm();

  const [raffle, setRaffle] = useState<WeeklyRaffle | null | undefined>(undefined);
  const [minWager, setMinWager] = useState("100");
  const [creating, setCreating] = useState(false);

  const [preview, setPreview] = useState<{ participants: WeeklyRaffleParticipant[]; count: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [excluded, setExcluded] = useState<WeeklyRaffleUserSearchResult[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [participantSearch, setParticipantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<WeeklyRaffleUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [history, setHistory] = useState<WeeklyRaffle[]>([]);
  const [pendingDraws, setPendingDraws] = useState<WeeklyRaffle[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [drawResult, setDrawResult] = useState<WeeklyRaffleDrawResult | null>(null);

  const [editing, setEditing] = useState(false);
  const [editWager, setEditWager] = useState("100");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [current, hist, pending] = await Promise.all([
        weeklyRaffleApi.getCurrent(),
        weeklyRaffleApi.getHistory(10),
        weeklyRaffleApi.getPendingDraws(),
      ]);
      setRaffle(current);
      setHistory(hist);
      setPendingDraws(pending);
    } catch {
      setRaffle(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadParticipants = useCallback(async (raffleId: string) => {
    setLoadingPreview(true);
    try {
      const [p, ex] = await Promise.all([
        weeklyRaffleApi.getEligiblePreview(raffleId),
        weeklyRaffleApi.getExcluded(raffleId),
      ]);
      setPreview(p);
      setExcluded(ex);
    } catch {
      setPreview(null);
      setExcluded([]);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (raffle && raffle.status === "OPEN") {
      loadParticipants(raffle.id);
    }
  }, [raffle?.id, raffle?.status, loadParticipants]);

  useEffect(() => {
    if (!raffle || raffle.status !== "OPEN") return;
    const query = participantSearch.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      weeklyRaffleApi
        .searchUsers(query)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [participantSearch, raffle?.id, raffle?.status]);

  const handleAddParticipant = async (user: WeeklyRaffleUserSearchResult) => {
    if (!raffle) return;
    setAddingId(user.id);
    try {
      await weeklyRaffleApi.addParticipant(raffle.id, user.id);
      success("Added", `${user.displayName} is now in this week's raffle.`);
      setParticipantSearch("");
      setSearchResults([]);
      await loadParticipants(raffle.id);
    } catch (e: any) {
      error("Failed to add", e.message || "Could not add this participant.");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveParticipant = async (participant: WeeklyRaffleParticipant) => {
    if (!raffle) return;
    const ok = await confirm({
      title: `Remove ${participant.displayName}?`,
      message: "They will no longer be entered in this week's raffle. You can add them back later.",
      confirmText: "Remove",
      confirmColor: "red",
    });
    if (!ok) return;
    setRemovingId(participant.id);
    try {
      await weeklyRaffleApi.removeParticipant(raffle.id, participant.id);
      success("Removed", `${participant.displayName} was removed from this week's raffle.`);
      await loadParticipants(raffle.id);
    } catch (e: any) {
      error("Failed to remove", e.message || "Could not remove this participant.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRestoreParticipant = async (user: WeeklyRaffleUserSearchResult) => {
    if (!raffle) return;
    setRestoringId(user.id);
    try {
      await weeklyRaffleApi.addParticipant(raffle.id, user.id);
      success("Restored", `${user.displayName} is back in this week's raffle.`);
      await loadParticipants(raffle.id);
    } catch (e: any) {
      error("Failed to restore", e.message || "Could not restore this participant.");
    } finally {
      setRestoringId(null);
    }
  };

  const handleCreate = async () => {
    const amount = Number(minWager);
    if (!amount || amount <= 0) {
      error("Invalid amount", "Enter a minimum wager greater than 0.");
      return;
    }
    setCreating(true);
    try {
      const created = await weeklyRaffleApi.create([{ type: "MIN_WEEKLY_WAGER", value: amount }]);
      setRaffle(created);
      success("Raffle created", "This week's raffle is now open.");
    } catch (e: any) {
      error("Failed", e.message || "Could not create raffle.");
    } finally {
      setCreating(false);
    }
  };

  const startEditing = () => {
    const current = raffle?.requirements.find((r) => r.type === "MIN_WEEKLY_WAGER")?.value ?? 100;
    setEditWager(String(current));
    setEditing(true);
  };

  const handleSaveRequirements = async () => {
    if (!raffle) return;
    const amount = Number(editWager);
    if (!amount || amount <= 0) {
      error("Invalid amount", "Enter a minimum wager greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const updated = await weeklyRaffleApi.updateRequirements(raffle.id, [{ type: "MIN_WEEKLY_WAGER", value: amount }]);
      setRaffle(updated);
      setEditing(false);
      success("Requirements updated", "");
    } catch (e: any) {
      error("Failed", e.message || "Could not update requirements.");
    } finally {
      setSaving(false);
    }
  };

  const handleDraw = async () => {
    if (!raffle) return;
    const ok = await confirm({
      title: "Draw this week's winner?",
      message: "This permanently selects and locks in the winner. This cannot be undone.",
      confirmText: "Start Draw",
      confirmColor: "yellow",
    });
    if (!ok) return;
    setDrawing(true);
    try {
      const result = await weeklyRaffleApi.draw(raffle.id);
      setDrawResult(result);
    } catch (e: any) {
      error("Draw failed", e.message || "Could not draw a winner.");
    } finally {
      setDrawing(false);
    }
  };

  const handleDrawPending = async (pending: WeeklyRaffle) => {
    const ok = await confirm({
      title: `Draw the winner for Week ${isoWeekNumber(pending.weekStart)}?`,
      message: "This week already ended without being drawn. This permanently selects and locks in the winner. This cannot be undone.",
      confirmText: "Start Draw",
      confirmColor: "yellow",
    });
    if (!ok) return;
    setDrawingId(pending.id);
    try {
      const result = await weeklyRaffleApi.draw(pending.id);
      setPendingDraws((prev) => prev.filter((p) => p.id !== pending.id));
      setDrawResult(result);
    } catch (e: any) {
      error("Draw failed", e.message || "Could not draw a winner.");
    } finally {
      setDrawingId(null);
    }
  };

  if (raffle === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white tracking-wide">Weekly Raffle</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          One eligibility-based raffle per calendar week, drawn every Monday
        </p>
      </div>

      {pendingDraws.length > 0 && (
        <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Needs Draw</h2>
          <p className="text-gray-400 text-sm mb-4">
            These weeks ended without a winner being drawn. Draw them now — eligibility is still based on that
            week's wager data, so this is safe to do late.
          </p>
          <div className="space-y-2">
            {pendingDraws.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 bg-navy-900/40 border border-white/6 rounded-lg px-3 py-2"
              >
                <span className="text-gray-300 text-sm">
                  Week {isoWeekNumber(p.weekStart)} ·{" "}
                  {new Date(p.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {new Date(p.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <button
                  onClick={() => handleDrawPending(p)}
                  disabled={drawingId === p.id}
                  className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5" /> {drawingId === p.id ? "Drawing…" : "Draw"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!raffle && (
        <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-1">Create this week's raffle</h2>
          <p className="text-gray-500 text-sm mb-4">No raffle exists yet for the current week (Monday–Monday, UTC).</p>
          <label className="block text-xs text-gray-500 mb-1">Minimum weekly wager under code ($)</label>
          <div className="flex gap-2 max-w-xs">
            <input
              type="number"
              min="1"
              value={minWager}
              onChange={(e) => setMinWager(e.target.value)}
              className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/40"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>
        </div>
      )}

      {raffle && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h2 className="text-white font-semibold">
                  Week {isoWeekNumber(raffle.weekStart)} ·{" "}
                  {new Date(raffle.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {new Date(raffle.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </h2>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    raffle.status === "OPEN" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
                  }`}
                >
                  {raffle.status}
                </span>
              </div>

              {!editing ? (
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="space-y-1">
                    {raffle.requirements.map((r, i) => (
                      <p key={i} className="text-gray-400 text-sm">
                        • Minimum weekly wager under code:{" "}
                        <span className="text-white font-semibold">${r.value.toLocaleString()}</span>
                      </p>
                    ))}
                  </div>
                  {raffle.status === "OPEN" && (
                    <button
                      onClick={startEditing}
                      title="Edit requirements"
                      className="flex items-center gap-1.5 bg-white/6 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-1">Minimum weekly wager under code ($)</label>
                  <div className="flex gap-2 max-w-xs">
                    <input
                      type="number"
                      min="1"
                      value={editWager}
                      onChange={(e) => setEditWager(e.target.value)}
                      className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/40"
                    />
                    <button
                      onClick={handleSaveRequirements}
                      disabled={saving}
                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-950 font-bold px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-white/6 hover:bg-white/10 text-gray-300 font-semibold px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {raffle.status === "OPEN" && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Users className="w-4 h-4" />
                    {loadingPreview
                      ? "Loading eligible participants…"
                      : `${preview?.count ?? 0} eligible participant${preview?.count === 1 ? "" : "s"}`}
                  </div>
                  <button
                    onClick={handleDraw}
                    disabled={drawing || !preview?.count}
                    className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-navy-950 font-bold px-5 py-2.5 rounded-lg text-sm transition-colors"
                  >
                    <Play className="w-4 h-4" /> {drawing ? "Drawing…" : "Start Draw"}
                  </button>
                </>
              )}

              {raffle.status === "DRAWN" && raffle.winner && (
                <div className="flex items-center gap-3 bg-gold-500/8 border border-gold-500/20 rounded-lg p-4">
                  <Trophy className="w-6 h-6 text-gold-400" />
                  <div>
                    <p className="text-white font-semibold">{raffle.winner.displayName} won this week's raffle</p>
                    <p className="text-gray-500 text-xs">
                      Drawn {raffle.drawnAt && new Date(raffle.drawnAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {raffle.status === "OPEN" && (
              <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Participants</h3>

                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Search a user to add…"
                    className="w-full bg-navy-900/60 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/40"
                  />
                  {participantSearch.trim().length >= 2 && (
                    <div className="absolute z-10 mt-1 w-full bg-navy-900 border border-white/10 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                      {searching ? (
                        <p className="text-gray-500 text-xs px-3 py-2">Searching…</p>
                      ) : searchResults.length === 0 ? (
                        <p className="text-gray-500 text-xs px-3 py-2">No users found.</p>
                      ) : (
                        searchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleAddParticipant(u)}
                            disabled={addingId === u.id || preview?.participants.some((p) => p.id === u.id)}
                            className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
                          >
                            <span>{u.displayName}</span>
                            {preview?.participants.some((p) => p.id === u.id) ? (
                              <span className="text-gray-500 text-xs">Already in</span>
                            ) : (
                              <UserPlus className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Users className="w-3.5 h-3.5" />
                  {loadingPreview
                    ? "Loading…"
                    : `${preview?.count ?? 0} participant${preview?.count === 1 ? "" : "s"}`}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {(preview?.participants ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-white/3"
                    >
                      <span className="text-gray-300 flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{p.displayName}</span>
                        {p.isManual && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gold-400 bg-gold-500/10 px-1.5 py-0.5 rounded">
                            Added
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-gold-300 font-mono text-xs">${p.wagered.toLocaleString()}</span>
                        <button
                          onClick={() => handleRemoveParticipant(p)}
                          disabled={removingId === p.id}
                          title="Remove from raffle"
                          className="opacity-0 group-hover:opacity-100 disabled:opacity-40 text-gray-500 hover:text-red-400 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                  {!loadingPreview && (preview?.participants.length ?? 0) === 0 && (
                    <p className="text-gray-500 text-sm">No participants yet.</p>
                  )}
                </div>

                {excluded.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/6">
                    <h4 className="text-gray-500 text-xs font-semibold mb-2">Removed by admin</h4>
                    <div className="space-y-1.5">
                      {excluded.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm px-2 py-1 rounded-lg">
                          <span className="text-gray-500">{u.displayName}</span>
                          <button
                            onClick={() => handleRestoreParticipant(u)}
                            disabled={restoringId === u.id}
                            className="text-xs text-gray-400 hover:text-gold-400 disabled:opacity-40 transition-colors"
                          >
                            {restoringId === u.id ? "Restoring…" : "Add back"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3">Previous Winners</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No completed raffles yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Week {isoWeekNumber(h.weekStart)}</span>
                    <span className="text-white font-medium">{h.winner?.displayName ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {dialog}

      {drawResult && (
        <EliminationReveal
          participants={drawResult.participants}
          eliminationOrder={drawResult.eliminationOrder}
          weekNumber={isoWeekNumber(drawResult.raffle.weekStart)}
          drawDate={drawResult.raffle.drawnAt ?? new Date().toISOString()}
          onFinished={load}
        />
      )}
    </div>
  );
}
