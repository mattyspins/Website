"use client";

import { useCallback, useEffect, useState } from "react";
import { weeklyRaffleApi, WeeklyRaffleParticipant, WeeklyRaffleUserSearchResult } from "@/lib/api/weeklyRaffle";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/admin/useConfirm";
import { Users, Search, UserPlus, X } from "lucide-react";

interface Props {
  raffleId: string;
  onCountChange?: (count: number) => void;
}

export default function WeeklyRaffleParticipants({ raffleId, onCountChange }: Props) {
  const { success, error } = useToast();
  const { confirm, dialog } = useConfirm();

  const [preview, setPreview] = useState<{ participants: WeeklyRaffleParticipant[]; count: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [excluded, setExcluded] = useState<WeeklyRaffleUserSearchResult[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [participantSearch, setParticipantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<WeeklyRaffleUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const [p, ex] = await Promise.all([
        weeklyRaffleApi.getEligiblePreview(raffleId),
        weeklyRaffleApi.getExcluded(raffleId),
      ]);
      setPreview(p);
      setExcluded(ex);
      onCountChange?.(p.count);
    } catch {
      setPreview(null);
      setExcluded([]);
    } finally {
      setLoadingPreview(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
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
  }, [participantSearch]);

  const handleAddParticipant = async (user: WeeklyRaffleUserSearchResult) => {
    setAddingId(user.id);
    try {
      await weeklyRaffleApi.addParticipant(raffleId, user.id);
      success("Added", `${user.displayName} is now in this raffle.`);
      setParticipantSearch("");
      setSearchResults([]);
      await loadParticipants();
    } catch (e: any) {
      error("Failed to add", e.message || "Could not add this participant.");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveParticipant = async (participant: WeeklyRaffleParticipant) => {
    const ok = await confirm({
      title: `Remove ${participant.displayName}?`,
      message: "They will no longer be entered in this raffle. You can add them back later.",
      confirmText: "Remove",
      confirmColor: "red",
    });
    if (!ok) return;
    setRemovingId(participant.id);
    try {
      await weeklyRaffleApi.removeParticipant(raffleId, participant.id);
      success("Removed", `${participant.displayName} was removed from this raffle.`);
      await loadParticipants();
    } catch (e: any) {
      error("Failed to remove", e.message || "Could not remove this participant.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRestoreParticipant = async (user: WeeklyRaffleUserSearchResult) => {
    setRestoringId(user.id);
    try {
      await weeklyRaffleApi.addParticipant(raffleId, user.id);
      success("Restored", `${user.displayName} is back in this raffle.`);
      await loadParticipants();
    } catch (e: any) {
      error("Failed to restore", e.message || "Could not restore this participant.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div>
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
        {loadingPreview ? "Loading…" : `${preview?.count ?? 0} participant${preview?.count === 1 ? "" : "s"}`}
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1.5">
        {(preview?.participants ?? []).map((p) => (
          <div key={p.id} className="group flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-white/3">
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

      {dialog}
    </div>
  );
}
