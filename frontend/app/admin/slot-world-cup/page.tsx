"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { slotWorldCupApi } from "@/lib/api/slotWorldCup";
import { SlotWorldCup, SlotWorldCupStatus, SlotWorldCupNominationRanking, SlotWorldCupLeaderboardEntry } from "@/types/slotWorldCup";
import SlotWorldCupBracket from "@/components/SlotWorldCupBracket";
import SlotPicker from "@/components/SlotPicker";
import { SLOT_GAMES } from "@/lib/slotGames";
import { useToast } from "@/components/ui/ToastProvider";

function roundLabel(round: number, totalRounds: number): string {
  const d = totalRounds - round;
  if (d === 0) return "Final";
  if (d === 1) return "Semi Final";
  if (d === 2) return "Quarter Final";
  return `Round ${round}`;
}

// Panel chrome from the Claude Design tournament UI — a darker, cooler surface
// than the rest of admin, so the control room reads as its own console.
const PANEL = "border border-[#2D3446] rounded-2xl bg-[#151922] p-5";
const PANEL_TITLE = "font-gaming font-bold text-sm tracking-[1px] text-white mb-1";

const MATCH_RULES = ["Bonus Buy", "100 Spins", "50 Spins"];

// Stable per-provider tint for the slot badges, so the same studio always reads
// the same colour across the queue and the bracket.
const PROVIDER_COLORS = [
  "#29B6F6", "#7C4DFF", "#00E5A0", "#FFD54A", "#FF8A96", "#4fbfd1", "#f5a623",
];
function providerColor(provider?: string | null): string {
  if (!provider) return "#2D3446";
  let h = 0;
  for (let i = 0; i < provider.length; i++) h = (h * 31 + provider.charCodeAt(i)) >>> 0;
  return PROVIDER_COLORS[h % PROVIDER_COLORS.length];
}

function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
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
  const [customRule, setCustomRule] = useState("");
  const [search, setSearch] = useState("");
  // Bumping this reshuffles the suggestion order; it's a seed rather than a
  // stored order so the list still re-sorts naturally as new votes arrive.
  const [shuffleSeed, setShuffleSeed] = useState(0);
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
      const summary = all.find((t) => t.status !== SlotWorldCupStatus.CANCELLED && t.status !== SlotWorldCupStatus.COMPLETED);
      // getAll() omits `matches` — the bracket and the pending-match editor both
      // need them, so re-read the live tournament in full.
      const live = summary ? await slotWorldCupApi.getById(summary.id) : null;
      setActive(live);
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

  // Best multiplier a slot has posted so far, shown next to each participant.
  // Derived from played matches rather than stored, so it can never drift.
  const bestMultiplier = (slotId: string): string => {
    if (!active?.matches) return "—";
    let best: number | null = null;
    for (const m of active.matches) {
      const mult = m.slotAId === slotId ? m.multiplierA : m.slotBId === slotId ? m.multiplierB : null;
      const n = mult == null ? null : Number(mult);
      if (n != null && !isNaN(n) && (best == null || n > best)) best = n;
    }
    return best == null ? "—" : `${best.toFixed(2)}x`;
  };

  const visibleSuggestions = (() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rankings.filter((r) => r.slotName.toLowerCase().includes(q) || r.by.toLowerCase().includes(q))
      : rankings.slice();
    if (shuffleSeed === 0) return list;
    // Deterministic per-seed shuffle so the order is stable across re-renders
    // and only changes when the admin actually presses Randomize.
    return list
      .map((r, i) => ({ r, k: Math.sin((i + 1) * 9301 + shuffleSeed * 49297) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.r);
  })();

  // Every control maps to an action the backend actually supports; anything not
  // yet possible is disabled with the reason rather than silently doing nothing.
  const st = active?.status;
  const slotsFull = (active?.slots?.length ?? 0) === active?.size;
  const controlButtons = !active ? [] : [
    {
      label: "⬡ Generate Bracket", bg: "rgba(41,182,246,.14)", color: "#29B6F6", border: "#29B6F6",
      disabled: st !== SlotWorldCupStatus.NOMINATION || !slotsFull,
      why: `Fill all ${active.size} participant places first`,
      onClick: () => withAction(() => slotWorldCupApi.generateBracket(active.id, "POPULARITY")),
    },
    {
      label: "⇄ Shuffle Bracket", bg: "rgba(124,77,255,.14)", color: "#b79dff", border: "#7C4DFF",
      disabled: st !== SlotWorldCupStatus.NOMINATION || !slotsFull,
      why: "Only available before the bracket is generated",
      onClick: () => withAction(() => slotWorldCupApi.generateBracket(active.id, "RANDOM")),
    },
    {
      label: "★ Auto-fill by Votes", bg: "rgba(255,213,74,.14)", color: "#FFD54A", border: "#FFD54A",
      disabled: st !== SlotWorldCupStatus.NOMINATION || (active.slots?.length ?? 0) > 0,
      why: "Only while nominating, and before any participant is added",
      onClick: () => withAction(() => slotWorldCupApi.finalizeParticipants(active.id, "auto")),
    },
    {
      label: active.nominationsOpen ? "🔒 Lock Nominations" : "🔓 Nominations Locked",
      bg: "#10141c", color: "#cfd6e4", border: "#2D3446",
      disabled: st !== SlotWorldCupStatus.NOMINATION || !active.nominationsOpen,
      why: "Nominations are already closed",
      onClick: () => withAction(() => slotWorldCupApi.lockNominations(active.id)),
    },
    {
      label: st === SlotWorldCupStatus.PREDICTIONS_OPEN ? "🔒 Close Predictions" : "🔓 Open Predictions",
      bg: st === SlotWorldCupStatus.PREDICTIONS_OPEN ? "rgba(124,77,255,.14)" : "rgba(0,229,160,.14)",
      color: st === SlotWorldCupStatus.PREDICTIONS_OPEN ? "#b79dff" : "#00E5A0",
      border: st === SlotWorldCupStatus.PREDICTIONS_OPEN ? "#7C4DFF" : "#00E5A0",
      disabled: st !== SlotWorldCupStatus.BRACKET_SET && st !== SlotWorldCupStatus.PREDICTIONS_OPEN,
      why: "Generate the bracket first",
      onClick: () => withAction(() =>
        st === SlotWorldCupStatus.PREDICTIONS_OPEN
          ? slotWorldCupApi.closePredictions(active.id)
          : slotWorldCupApi.openPredictions(active.id)),
    },
    {
      label: "⬇ Export Results", bg: "#10141c", color: "#cfd6e4", border: "#2D3446",
      disabled: false, why: "",
      onClick: () => exportResults(),
    },
    {
      label: "↺ Reset Tournament", bg: "#10141c", color: "#FF8A96", border: "#2D3446",
      disabled: st === SlotWorldCupStatus.COMPLETED,
      why: "A completed tournament can't be reset",
      onClick: () => {
        if (!window.confirm("Reset this tournament? The bracket, participants and every prediction are deleted, and suggestions return to the pending queue.")) return;
        return withAction(() => slotWorldCupApi.reset(active.id));
      },
    },
    {
      label: "✕ Cancel Tournament", bg: "#10141c", color: "#FF8A96", border: "#2D3446",
      disabled: st === SlotWorldCupStatus.COMPLETED,
      why: "Already completed",
      onClick: () => {
        if (!window.confirm(`Cancel "${active.title}"? This closes it for good.`)) return;
        return withAction(() => slotWorldCupApi.cancel(active.id));
      },
    },
  ];

  // Client-side CSV: everything needed is already loaded, so this avoids an
  // endpoint whose only job would be re-serialising what the page has.
  function exportResults() {
    if (!active) return;
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const slotName = (id?: string | null) =>
      active.slots?.find((s) => s.id === id)?.slotName ?? "";

    const rows: string[][] = [["Round", "Match", "Slot A", "Bet A", "Payout A", "Mult A", "Slot B", "Bet B", "Payout B", "Mult B", "Winner"]];
    for (const m of (active.matches ?? []).slice().sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)) {
      rows.push([
        String(m.round), String(m.matchNumber + 1),
        slotName(m.slotAId), String(m.betAmountA ?? ""), String(m.payoutAmountA ?? ""), String(m.multiplierA ?? ""),
        slotName(m.slotBId), String(m.betAmountB ?? ""), String(m.payoutAmountB ?? ""), String(m.multiplierB ?? ""),
        slotName(m.winnerId),
      ]);
    }
    rows.push([], ["Rank", "Player", "Score", "Correct picks", "Accuracy"]);
    for (const e of leaderboard) {
      rows.push([String(e.rank), e.displayName, String(e.score), String(e.correctPicks), `${Math.round(e.accuracy * 100)}%`]);
    }

    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

          {/* ─── Control room ────────────────────────────────────────────────
              Two columns: run-the-show controls on the left, the live chat
              suggestion queue on the right, so the admin never has to scroll
              away from pending approvals while driving the bracket. */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-5 items-start">
            <div className="flex flex-col gap-5">

              {/* TOURNAMENT CONTROLS */}
              <section className={PANEL}>
                <h3 className={PANEL_TITLE}>TOURNAMENT CONTROLS</h3>
                <p className="text-xs text-[#6b7488] mb-4">Run the show from here — generate, lock, and advance matches live.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {controlButtons.map((b) => (
                    <button key={b.label} onClick={b.onClick} disabled={actionLoading || b.disabled}
                      title={b.disabled ? b.why : undefined}
                      className="font-gaming font-semibold text-[13px] px-3 py-3 rounded-[10px] border text-left transition-all hover:brightness-125 disabled:opacity-35 disabled:cursor-not-allowed"
                      style={{ borderColor: b.border, background: b.bg, color: b.color }}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* MATCH RULES */}
              <section className={PANEL}>
                <h3 className={PANEL_TITLE}>MATCH RULES</h3>
                <div className="flex gap-2.5 flex-wrap">
                  {MATCH_RULES.map((r) => {
                    const on = active.matchRule === r;
                    return (
                      <button key={r} onClick={() => withAction(() => slotWorldCupApi.setMatchRule(active.id, r))}
                        disabled={actionLoading}
                        className="font-gaming font-semibold text-[13px] px-[18px] py-2.5 rounded-[10px] border disabled:opacity-40"
                        style={{
                          borderColor: on ? "#FFD54A" : "#2D3446",
                          background: on ? "rgba(255,213,74,.16)" : "#10141c",
                          color: on ? "#FFD54A" : "#cfd6e4",
                        }}>
                        {r}
                      </button>
                    );
                  })}
                </div>
                {/* A custom rule is free text, so it gets its own input rather than
                    pretending the four presets cover every format. */}
                <div className="flex gap-2 mt-3">
                  <input value={customRule} onChange={(e) => setCustomRule(e.target.value)}
                    placeholder="Custom rule — e.g. 200 spins @ £2"
                    className="flex-1 bg-[#10141c] border border-[#2D3446] rounded-[9px] px-3 py-2 text-[13px] text-white placeholder:text-[#6b7488] focus:outline-none focus:border-[#FFD54A]/50" />
                  <button onClick={() => withAction(async () => { await slotWorldCupApi.setMatchRule(active.id, customRule.trim()); setCustomRule(""); })}
                    disabled={actionLoading || !customRule.trim()}
                    className="px-4 rounded-[9px] border border-[#2D3446] bg-[#10141c] text-[#cfd6e4] text-xs font-semibold disabled:opacity-40">
                    Set
                  </button>
                </div>
                <p className="mt-3.5 text-xs text-[#6b7488]">
                  Winner determined by <span className="text-[#FFD54A] font-semibold">Highest Multiplier</span>. Loser is eliminated.
                </p>
              </section>

              {/* APPROVED PARTICIPANTS */}
              <section className={PANEL}>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className={`${PANEL_TITLE} mb-0`}>APPROVED PARTICIPANTS</h3>
                  <span className="text-xs font-bold text-[#29B6F6]">{active.slots?.length ?? 0} / {active.size} slots</span>
                </div>
                {(active.slots?.length ?? 0) === 0 ? (
                  <p className="text-[13px] text-[#6b7488] py-6 text-center">
                    No participants yet — approve chat suggestions or add a slot below.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                    {(active.slots ?? []).map((s) => (
                      <div key={s.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] border border-[#22283a] bg-[#10141c]">
                        <span className="w-[26px] h-[26px] rounded-md flex items-center justify-center font-gaming font-bold text-[10px] text-white shrink-0"
                          style={{ background: `linear-gradient(135deg, ${providerColor(s.provider)}, #12151d)` }}>
                          {initials(s.slotName)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-white truncate">{s.slotName}</div>
                          <div className="text-[10px]" style={{ color: providerColor(s.provider) }}>{s.provider ?? "—"}</div>
                        </div>
                        <span className="font-gaming font-bold text-xs text-[#FFD54A]">{bestMultiplier(s.id)}</span>
                        {active.status === SlotWorldCupStatus.NOMINATION && (
                          <button onClick={() => withAction(() => slotWorldCupApi.removeSlot(active.id, s.id))} disabled={actionLoading}
                            aria-label={`Remove ${s.slotName}`}
                            className="text-[#FF8A96] hover:text-red-400 text-sm px-1 disabled:opacity-40">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {active.status === SlotWorldCupStatus.NOMINATION && (
                  <div className="border-t border-[#22283a] mt-4 pt-4">
                    <p className="text-xs text-[#6b7488] mb-2">Add a slot directly (bypasses voting):</p>
                    {/* Same catalogue picker the other stream games use, so names
                        match slot.report exactly instead of being free-typed. */}
                    <SlotPicker value={manualSlot} onChange={setManualSlot} disabled={actionLoading}
                      placeholder="Search for a slot…" />
                    <button
                      onClick={() => withAction(async () => {
                        const name = manualSlot.trim();
                        // Carry the catalogue's provider + art through when the pick
                        // is a known slot; a free-typed name just sends the name.
                        const game = SLOT_GAMES.find((g) => g.name === name);
                        await slotWorldCupApi.addSlot(active.id, name, game?.provider, game?.image);
                        setManualSlot("");
                      })}
                      disabled={actionLoading || !manualSlot.trim()}
                      className="w-full mt-2 px-4 py-2 rounded-[9px] border border-[#2D3446] bg-[#10141c] text-[#cfd6e4] text-sm font-semibold hover:brightness-125 disabled:opacity-40">
                      Add slot
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* CHAT SUGGESTIONS */}
            <section className={`${PANEL} flex flex-col`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className={`${PANEL_TITLE} mb-0`}>CHAT SUGGESTIONS</h3>
                <span className="text-xs font-bold text-[#7C4DFF]">{rankings.length} pending</span>
              </div>
              <p className="text-xs text-[#6b7488] mb-3.5">
                Viewers submit with <span className="text-[#29B6F6] font-mono">{active.nominationCommand} Slot Name</span>
              </p>

              <div className="flex gap-2 mb-3.5">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suggestions…"
                  className="flex-1 px-3 py-2.5 rounded-[9px] border border-[#2D3446] bg-[#10141c] text-[13px] text-white placeholder:text-[#6b7488] focus:outline-none focus:border-[#29B6F6]/50" />
                {/* Shuffles the display order so picking isn't biased toward whoever
                    shouted first — the underlying vote counts are untouched. */}
                <button onClick={() => setShuffleSeed((n) => n + 1)}
                  className="px-3.5 rounded-[9px] border border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#b79dff] text-xs font-semibold whitespace-nowrap">
                  Randomize
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[620px]">
                {visibleSuggestions.length === 0 ? (
                  <p className="py-8 text-center text-[#6b7488] text-[13px]">
                    {rankings.length === 0 ? "No suggestions yet." : "No suggestions match your search."}
                  </p>
                ) : visibleSuggestions.map((p) => {
                  const game = SLOT_GAMES.find((g) => g.name.toLowerCase() === p.slotName.toLowerCase());
                  return (
                    <div key={p.key} className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] border border-[#22283a] bg-[#10141c]">
                      <span className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center font-gaming font-bold text-[11px] text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${providerColor(game?.provider)}, #12151d)` }}>
                        {initials(p.slotName)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] text-white truncate">{p.slotName}</div>
                        <div className="text-[11px] text-[#6b7488] truncate">
                          by {p.by} · <span className="text-[#29B6F6]">{p.votes} vote{p.votes === 1 ? "" : "s"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => withAction(() => slotWorldCupApi.approveNomination(active.id, p.key, game?.provider, game?.image))}
                        disabled={actionLoading || (active.slots?.length ?? 0) >= active.size}
                        title={(active.slots?.length ?? 0) >= active.size ? "All participant places are filled" : undefined}
                        className="font-gaming font-bold text-xs px-3 py-1.5 rounded-lg border border-[#00E5A0] bg-[#00E5A0]/15 text-[#00E5A0] hover:bg-[#00E5A0]/25 disabled:opacity-35 disabled:cursor-not-allowed">
                        Approve
                      </button>
                      <button onClick={() => withAction(() => slotWorldCupApi.rejectNomination(active.id, p.key))} disabled={actionLoading}
                        className="font-gaming font-bold text-xs px-3 py-1.5 rounded-lg border border-[#2D3446] bg-[#10141c] text-[#FF8A96] hover:border-[#FF5C6C] disabled:opacity-40">
                        Reject
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {(active.matches?.length ?? 0) > 0 && (
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
                {(active.matches ?? [])
                  .filter((m) => m.slotAId && m.slotBId && !m.winnerId)
                  .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
                  .map((m) => {
                    const slotA = (active.slots ?? []).find((s) => s.id === m.slotAId);
                    const slotB = (active.slots ?? []).find((s) => s.id === m.slotBId);
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
                {(active.matches ?? []).filter((m) => m.slotAId && m.slotBId && !m.winnerId).length === 0 && (
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
