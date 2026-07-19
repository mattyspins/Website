"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { slotWorldCupApi } from "@/lib/api/slotWorldCup";
import { SlotWorldCup, SlotWorldCupStatus, SlotWorldCupNominationRanking, SlotWorldCupLeaderboardEntry } from "@/types/slotWorldCup";
import SlotWorldCupBracket from "@/components/SlotWorldCupBracket";
import { useToast } from "@/components/ui/ToastProvider";

function roundLabel(round: number, totalRounds: number): string {
  const d = totalRounds - round;
  if (d === 0) return "Final";
  if (d === 1) return "Semi Final";
  if (d === 2) return "Quarter Final";
  return `Round ${round}`;
}

export default function AdminSlotWorldCupPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tournaments, setTournaments] = useState<SlotWorldCup[]>([]);
  const [active, setActive] = useState<SlotWorldCup | null>(null);
  const [rankings, setRankings] = useState<SlotWorldCupNominationRanking[]>([]);
  const [leaderboard, setLeaderboard] = useState<SlotWorldCupLeaderboardEntry[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [size, setSize] = useState<8 | 12 | 16>(8);
  const [nominationCommand, setNominationCommand] = useState("!wc");
  const [manualSlot, setManualSlot] = useState("");
  const [seeding, setSeeding] = useState<"RANDOM" | "POPULARITY">("POPULARITY");
  const [manualList, setManualList] = useState("");
  const [matchResults, setMatchResults] = useState<Record<string, { betA: string; payoutA: string; betB: string; payoutB: string }>>({});

  const updateMatchResult = (matchId: string, field: "betA" | "payoutA" | "betB" | "payoutB", value: string) => {
    setMatchResults((prev) => {
      const current = prev[matchId] ?? { betA: "", payoutA: "", betB: "", payoutB: "" };
      return { ...prev, [matchId]: { ...current, [field]: value } };
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (!d.user?.isAdmin) router.push("/"); else setAuthed(true); })
      .catch(() => router.push("/"));
  }, [router]);

  const load = useCallback(async () => {
    try {
      const all = await slotWorldCupApi.getAll();
      setTournaments(all);
      const live = all.find((t) => t.status !== SlotWorldCupStatus.CANCELLED && t.status !== SlotWorldCupStatus.COMPLETED);
      setActive(live ?? null);
      if (live) {
        if (live.status === SlotWorldCupStatus.NOMINATION) setRankings(await slotWorldCupApi.getNominations(live.id));
        else setLeaderboard(await slotWorldCupApi.getLeaderboard(live.id));
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  useEffect(() => {
    if (!authed || !active) return;
    const socket = getSocket();
    socket.emit("joinSlotWorldCup", active.id);
    const onUpdate = (updated: SlotWorldCup) => { if (updated.id === active.id) load(); };
    socket.on("slotWorldCup:updated", onUpdate);
    socket.on("slotWorldCup:nominationsUpdated", () => slotWorldCupApi.getNominations(active.id).then(setRankings).catch(() => {}));
    return () => {
      socket.emit("leaveSlotWorldCup", active.id);
      socket.off("slotWorldCup:updated", onUpdate);
      socket.off("slotWorldCup:nominationsUpdated");
    };
  }, [authed, active?.id, load]);

  const withAction = async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try { await fn(); await load(); success("Done", "Action completed."); }
    catch (e: any) { toastError("Action failed", e.message || "Something went wrong."); }
    finally { setActionLoading(false); }
  };

  const handleCreate = () => {
    if (!title.trim()) { toastError("Title required", "Give the tournament a name."); return; }
    if (!nominationCommand.trim().startsWith("!")) { toastError("Invalid command", "Nomination command must start with \"!\"."); return; }
    return withAction(() => slotWorldCupApi.create({ title: title.trim(), size, nominationCommand: nominationCommand.trim() }));
  };

  const handleSubmitResult = (matchId: string) => {
    const r = matchResults[matchId];
    const betA = Number(r?.betA), payoutA = Number(r?.payoutA), betB = Number(r?.betB), payoutB = Number(r?.payoutB);
    if (!r?.betA || !r?.payoutA || !r?.betB || !r?.payoutB || !(betA > 0) || !(betB > 0) || isNaN(payoutA) || isNaN(payoutB)) {
      toastError("Missing result", "Enter bet + payout for both slots.");
      return;
    }
    return withAction(async () => {
      await slotWorldCupApi.submitMatchResult(matchId, betA, payoutA, betB, payoutB);
      setMatchResults((prev) => { const next = { ...prev }; delete next[matchId]; return next; });
    });
  };

  if (loading) return <div className="text-white/50 text-sm p-6">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white tracking-wide">Slot World Cup</h1>
        <p className="text-gray-500 text-sm mt-0.5">Nominate, seed, and run the community slot bracket tournament.</p>
      </div>

      {!active ? (
        <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6 max-w-md">
          <h2 className="text-white font-semibold mb-4">Create Tournament</h2>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer Slot World Cup"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 mb-3 focus:outline-none focus:border-yellow-400/40"
          />
          <div className="flex gap-2 mb-3">
            {[8, 12, 16].map((s) => (
              <button key={s} onClick={() => setSize(s as 8 | 12 | 16)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${size === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white/60 border-white/10"}`}>
                {s} slots
              </button>
            ))}
          </div>
          <label className="block text-xs text-gray-500 mb-1">Nomination command (viewers type this in Kick chat)</label>
          <input
            value={nominationCommand} onChange={(e) => setNominationCommand(e.target.value)} placeholder="!wc"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 mb-4 font-mono focus:outline-none focus:border-yellow-400/40"
          />
          <button onClick={handleCreate} disabled={actionLoading}
            className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm">
            Create Tournament
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-white font-bold text-lg">{active.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{active.status} · {active.size} slots · Round {active.currentRound}/{active.totalRounds}</p>
            </div>
            <button onClick={() => withAction(() => slotWorldCupApi.cancel(active.id))} disabled={actionLoading}
              className="px-3 py-1.5 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 text-xs font-medium disabled:opacity-40">
              Cancel Tournament
            </button>
          </div>

          {active.status === SlotWorldCupStatus.NOMINATION && (
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5 space-y-5">
              <div>
                <h3 className="text-white font-semibold mb-3">Nominations ({rankings.length})</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {rankings.map((r) => (
                    <div key={r.rank} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm ${r.rank <= active.size ? "bg-yellow-400/8" : "bg-white/3"}`}>
                      <span className="w-6 text-center font-bold text-yellow-400">{r.rank}</span>
                      <span className="flex-1 text-white">{r.slotName}</span>
                      <span className="text-white/40 text-xs">{r.votes} votes</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => withAction(() => slotWorldCupApi.lockNominations(active.id))} disabled={actionLoading || !active.nominationsOpen}
                  className="px-3 py-2 bg-white/8 hover:bg-white/12 text-white rounded-lg text-sm disabled:opacity-40">
                  {active.nominationsOpen ? "Lock Nominations" : "Nominations Locked ✓"}
                </button>
              </div>

              <div className="border-t border-white/8 pt-4">
                <p className="text-xs text-gray-500 mb-2">Add a slot manually (bypasses voting):</p>
                <div className="flex gap-2 mb-4">
                  <input value={manualSlot} onChange={(e) => setManualSlot(e.target.value)} placeholder="Slot name"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30" />
                  <button onClick={() => withAction(async () => { await slotWorldCupApi.addSlot(active.id, manualSlot.trim()); setManualSlot(""); })}
                    disabled={actionLoading || !manualSlot.trim()}
                    className="px-4 py-2 bg-white/8 hover:bg-white/12 text-white rounded-lg text-sm disabled:opacity-40">
                    Add
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-2">Finalize {active.size} participants:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button onClick={() => withAction(() => slotWorldCupApi.finalizeParticipants(active.id, "auto"))} disabled={actionLoading}
                    className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm">
                    Auto-fill Top {active.size} by votes
                  </button>
                </div>
                <textarea value={manualList} onChange={(e) => setManualList(e.target.value)}
                  placeholder={`Or paste ${active.size} slot names, one per line, to bypass voting entirely`}
                  rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 mb-2" />
                <button
                  onClick={() => withAction(() => slotWorldCupApi.finalizeParticipants(active.id, "manual", manualList.split("\n").map((s) => s.trim()).filter(Boolean)))}
                  disabled={actionLoading || manualList.split("\n").map((s) => s.trim()).filter(Boolean).length !== active.size}
                  className="px-4 py-2 bg-white/8 hover:bg-white/12 text-white rounded-lg text-sm disabled:opacity-40">
                  Finalize Manual List
                </button>
              </div>
            </div>
          )}

          {active.status === SlotWorldCupStatus.NOMINATION && active.slots?.length === active.size && (
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">Generate Bracket</h3>
              <div className="flex gap-2 mb-3">
                {(["POPULARITY", "RANDOM"] as const).map((s) => (
                  <button key={s} onClick={() => setSeeding(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${seeding === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 text-white/60 border-white/10"}`}>
                    {s === "POPULARITY" ? "Popularity (1v16, 2v15…)" : "Random"}
                  </button>
                ))}
              </div>
              <button onClick={() => withAction(() => slotWorldCupApi.generateBracket(active.id, seeding))} disabled={actionLoading}
                className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm">
                Generate Bracket
              </button>
            </div>
          )}

          {active.status === SlotWorldCupStatus.BRACKET_SET && (
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
              <button onClick={() => withAction(() => slotWorldCupApi.openPredictions(active.id))} disabled={actionLoading}
                className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm">
                Open Predictions
              </button>
            </div>
          )}

          {active.matches?.length > 0 && (
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">Bracket</h3>
              <SlotWorldCupBracket tournament={active} mode="view" />
            </div>
          )}

          {[SlotWorldCupStatus.PREDICTIONS_OPEN, SlotWorldCupStatus.IN_PROGRESS].includes(active.status) && (
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-1">Pending Matches</h3>
              <p className="text-xs text-gray-500 mb-3">Enter the bet + payout for each slot's round — the multiplier is calculated automatically and the higher one wins.</p>
              <div className="space-y-3">
                {active.matches
                  .filter((m) => m.slotAId && m.slotBId && !m.winnerId)
                  .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
                  .map((m) => {
                    const slotA = active.slots.find((s) => s.id === m.slotAId);
                    const slotB = active.slots.find((s) => s.id === m.slotBId);
                    const r = matchResults[m.id] ?? { betA: "", payoutA: "", betB: "", payoutB: "" };
                    const multA = Number(r.betA) > 0 && r.payoutA !== "" ? Number(r.payoutA) / Number(r.betA) : null;
                    const multB = Number(r.betB) > 0 && r.payoutB !== "" ? Number(r.payoutB) / Number(r.betB) : null;
                    return (
                      <div key={m.id} className="bg-white/3 border border-white/8 rounded-lg p-3 space-y-2">
                        <span className="text-xs text-white/40">{roundLabel(m.round, active.totalRounds)}</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <p className="text-sm text-white font-medium truncate">{slotA?.slotName ?? "?"}</p>
                            <div className="flex gap-1.5">
                              <input type="number" placeholder="Bet" value={r.betA} onChange={(e) => updateMatchResult(m.id, "betA", e.target.value)}
                                className="w-1/2 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30" />
                              <input type="number" placeholder="Payout" value={r.payoutA} onChange={(e) => updateMatchResult(m.id, "payoutA", e.target.value)}
                                className="w-1/2 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30" />
                            </div>
                            {multA !== null && <p className="text-xs text-yellow-400 font-semibold">{multA.toFixed(2)}x</p>}
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-sm text-white font-medium truncate">{slotB?.slotName ?? "?"}</p>
                            <div className="flex gap-1.5">
                              <input type="number" placeholder="Bet" value={r.betB} onChange={(e) => updateMatchResult(m.id, "betB", e.target.value)}
                                className="w-1/2 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30" />
                              <input type="number" placeholder="Payout" value={r.payoutB} onChange={(e) => updateMatchResult(m.id, "payoutB", e.target.value)}
                                className="w-1/2 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30" />
                            </div>
                            {multB !== null && <p className="text-xs text-yellow-400 font-semibold">{multB.toFixed(2)}x</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSubmitResult(m.id)} disabled={actionLoading}
                          className="w-full py-1.5 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-40 text-sm">
                          Submit Result
                        </button>
                      </div>
                    );
                  })}
                {active.matches.filter((m) => m.slotAId && m.slotBId && !m.winnerId).length === 0 && (
                  <p className="text-white/30 text-sm">No matches ready to resolve yet.</p>
                )}
              </div>
            </div>
          )}

          {(active.status === SlotWorldCupStatus.PREDICTIONS_OPEN || active.status === SlotWorldCupStatus.IN_PROGRESS) && leaderboard.length > 0 && (
            <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">Leaderboard</h3>
              <div className="space-y-1">
                {leaderboard.slice(0, 10).map((e) => (
                  <div key={e.userId} className="flex items-center gap-3 text-sm px-3 py-1.5 bg-white/3 rounded-lg">
                    <span className="w-6 text-center font-bold text-yellow-400">{e.rank}</span>
                    <span className="flex-1 text-white">{e.displayName}</span>
                    <span className="text-white/50">{e.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tournaments.filter((t) => t.status === SlotWorldCupStatus.COMPLETED).length > 0 && (
        <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Past Tournaments</h3>
          <div className="space-y-1">
            {tournaments.filter((t) => t.status === SlotWorldCupStatus.COMPLETED).map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm px-3 py-1.5 bg-white/3 rounded-lg">
                <span className="flex-1 text-white">{t.title}</span>
                <span className="text-white/40 text-xs">{t.size} slots · {new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
