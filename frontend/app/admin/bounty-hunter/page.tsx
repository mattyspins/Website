"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { bountyHunterApi, BountyHunter } from "@/lib/api/bountyHunter";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/admin/useConfirm";
import { computeBoard, heatInfo } from "@/lib/bountyHunterVisuals";
import BountyHunterStyles from "@/components/bountyHunter/BountyHunterStyles";
import BountyArena, { ArenaEffect } from "@/components/bountyHunter/BountyArena";
import { BountyBoard } from "@/components/bountyHunter/BountyBoard";
import ClaimOverlay from "@/components/bountyHunter/ClaimOverlay";
import SlotPicker from "@/components/SlotPicker";
import { ExternalLink, Trash2 } from "lucide-react";

const panelStyle: CSSProperties = { background: "oklch(0.17 0.02 70 / 0.7)", backdropFilter: "blur(8px)", border: "1px solid oklch(0.32 0.04 75 / 0.35)", borderRadius: 14, padding: 20 };
const panelTitleStyle: CSSProperties = { fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, color: "oklch(0.72 0.11 75)", marginBottom: 14 };
const primaryBtnStyle: CSSProperties = { padding: "10px 14px", borderRadius: 8, border: "none", background: "linear-gradient(90deg, oklch(0.8 0.14 80), oklch(0.66 0.15 55))", color: "oklch(0.12 0.01 70)", fontWeight: 800, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontSize: 14 };
const ghostBtnStyle: CSSProperties = { flex: 1, padding: 9, borderRadius: 8, border: "1px solid oklch(0.4 0.07 75 / 0.5)", background: "transparent", color: "oklch(0.82 0.08 75)", fontWeight: 700, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif" };
const ghostBtnStyleRed: CSSProperties = { ...ghostBtnStyle, border: "1px solid oklch(0.5 0.15 25 / 0.5)", color: "oklch(0.72 0.15 25)" };
const numInputStyle: CSSProperties = { width: "100%", padding: 12, background: "oklch(0.1 0.01 70)", border: "1px solid oklch(0.35 0.05 75 / 0.6)", borderRadius: 8, color: "oklch(0.95 0.01 70)", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 18 };
const smallInputStyle: CSSProperties = { width: "100%", padding: "9px 10px", background: "oklch(0.1 0.01 70)", border: "1px solid oklch(0.35 0.05 75 / 0.6)", borderRadius: 8, color: "oklch(0.95 0.01 70)", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 15 };

export default function AdminBountyHunterPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { confirm, dialog } = useConfirm();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [hunt, setHunt] = useState<BountyHunter | null>(null);
  const [completedHunt, setCompletedHunt] = useState<BountyHunter | null>(null);
  const [history, setHistory] = useState<BountyHunter[]>([]);

  const [keyword, setKeyword] = useState("!bounty");
  const [targetMin, setTargetMin] = useState("50");
  const [targetMax, setTargetMax] = useState("500");
  const [claimZoneInput, setClaimZoneInput] = useState("25");
  const [potInput, setPotInput] = useState("5000");
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [baseBet, setBaseBet] = useState("");
  const [finalWin, setFinalWin] = useState("");
  const [arenaEffect, setArenaEffect] = useState<ArenaEffect | null>(null);
  const [lastScoredRoundId, setLastScoredRoundId] = useState<string | null>(null);

  const [setupTarget, setSetupTarget] = useState("");
  const [setupClaimZone, setSetupClaimZone] = useState("");
  const [setupPot, setSetupPot] = useState("");

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
      const all = await bountyHunterApi.getAll();
      setHistory(all.filter((h) => h.status === "SETTLED"));
    } catch { /* ignore */ }
  }, []);

  const refreshActive = useCallback(async () => {
    try {
      const active = await bountyHunterApi.getActiveAdmin();
      setHunt(active);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      await refreshActive();
      await loadHistory();
      setLoading(false);
    })();
  }, [authed, refreshActive, loadHistory]);

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, [authed, loadHistory]);

  useEffect(() => {
    if (!hunt) return;
    setSetupTarget(String(hunt.target ?? ""));
    setSetupClaimZone(String(hunt.claimZone));
    setSetupPot(String(hunt.pot));
  }, [hunt?.id, hunt?.target, hunt?.claimZone, hunt?.pot]);

  useEffect(() => {
    if (!authed || !hunt) return;
    const socket = getSocket();
    socket.emit("joinBountyHunter", hunt.id);
    // Sockets only ever carry the public (secret-free) payload — the admin dashboard
    // re-fetches the authenticated endpoint on any ping so it keeps seeing the real
    // target/distance even when another admin or chat activity changes the hunt.
    const onUpdate = (updated: BountyHunter) => {
      if (updated.status === "SETTLED") {
        if (hunt.id === updated.id) {
          setHunt(null);
          setCompletedHunt(updated);
          setHistory((prev) => [updated, ...prev.filter((h) => h.id !== updated.id)]);
        }
        return;
      }
      if (updated.id !== hunt.id) return;
      refreshActive();
    };
    socket.on("bountyhunter:updated", onUpdate);
    return () => {
      socket.emit("leaveBountyHunter", hunt.id);
      socket.off("bountyhunter:updated", onUpdate);
    };
  }, [authed, hunt?.id, refreshActive]);

  const withAction = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setActionLoading(true);
    try {
      return await fn();
    } catch (e: any) {
      error("Action failed", e.message || "Something went wrong.");
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!keyword.trim()) { error("Keyword required", "Enter an entry keyword, e.g. !bounty"); return; }
    setCreating(true);
    try {
      const created = await bountyHunterApi.create(
        keyword.trim(),
        Number(targetMin) || 50,
        Number(targetMax) || 500,
        Number(claimZoneInput) || 25,
        Number(potInput) || 5000
      );
      setHunt(created);
      setCompletedHunt(null);
      success("Bounty posted", `Viewers can now type "${created.keyword}" in chat to join.`);
    } catch (e: any) {
      error("Failed", e.message || "Could not start the bounty.");
    } finally { setCreating(false); }
  };

  const handleToggleRegistration = () => hunt && withAction(async () => setHunt(await bountyHunterApi.setRegistrationOpen(hunt.id, !hunt.registrationOpen)));

  const handleManualAdd = async () => {
    if (!hunt || !manualUsername.trim()) return;
    const updated = await withAction(() => bountyHunterApi.addEntry(hunt.id, manualUsername.trim()));
    if (updated) { setHunt(updated); setManualUsername(""); }
  };

  const handleRemoveEntry = (entryId: string) => withAction(async () => setHunt(await bountyHunterApi.removeEntry(entryId)));

  const handleDraw = () => hunt && withAction(async () => setHunt(await bountyHunterApi.draw(hunt.id)));

  const currentEntry = useMemo(() => hunt?.entries.find((e) => e.status === "DRAWN") ?? null, [hunt]);
  const hasWaitingEntries = useMemo(() => hunt?.entries.some((e) => e.status === "WAITING") ?? false, [hunt]);
  const currentRound = useMemo(() => hunt?.rounds.find((r) => r.entryId === currentEntry?.id && !r.playedAt) ?? null, [hunt, currentEntry]);

  const handlePickSlot = (slotName: string) => currentEntry && withAction(async () => setHunt(await bountyHunterApi.setSlot(currentEntry.id, slotName)));
  const handleSkipPlayer = () => currentEntry && withAction(async () => {
    const updated = await bountyHunterApi.skipPlayer(currentEntry.id);
    setHunt(updated);
    setBaseBet(""); setFinalWin("");
  });

  const triggerEffect = (bannerText: string | null, flashColor: string | null, shake: boolean) => {
    setArenaEffect({ key: Date.now(), bannerText, flashColor, shake });
  };

  const handleSubmitRound = () => currentEntry && withAction(async () => {
    const bet = parseFloat(baseBet);
    const win = parseFloat(finalWin);
    if (!(bet > 0) || isNaN(win)) { error("Invalid entry", "Enter a valid base bet and final win."); return; }
    const result = await bountyHunterApi.submitRound(currentEntry.id, bet, win);
    setHunt(result.hunt);
    setLastScoredRoundId(result.hunt.rounds.find((r) => r.entryId === currentEntry.id && r.playedAt)?.id ?? null);
    const flash = result.qualifies ? "oklch(0.75 0.15 80 / 0.4)" : null;
    triggerEffect(result.qualifies ? `🎯 ${result.heat} — IN THE ZONE` : null, flash, true);
    setBaseBet(""); setFinalWin("");
  });

  const handleSettleBounty = async () => {
    if (!hunt) return;
    if (!(await confirm({ title: "Settle this bounty?", message: "The closest qualifying shot claims the pot. If nothing qualifies, the bounty rolls over automatically.", confirmText: "Settle", confirmColor: "yellow" }))) return;
    const updated = await withAction(() => bountyHunterApi.settleBounty(hunt.id));
    if (!updated) return;
    if (updated.status === "SETTLED") { setCompletedHunt(updated); setHunt(null); loadHistory(); }
    else { setHunt(updated); success("Rolled over", `Nobody landed in the claim zone — pot is now 🪙 ${updated.pot.toLocaleString()}.`); }
  };

  const handleForceRollover = async () => {
    if (!hunt) return;
    if (!(await confirm({ title: "Force a rollover?", message: "This grows the pot and claim zone, rolls a new secret target, and returns all hunters to the waiting pool.", confirmText: "Roll Over", confirmColor: "yellow" }))) return;
    const updated = await withAction(() => bountyHunterApi.forceRollover(hunt.id));
    if (updated) { setHunt(updated); success("Rolled over", `New target set — pot is now 🪙 ${updated.pot.toLocaleString()}.`); }
  };

  const handleRerollTarget = () => hunt && withAction(async () => {
    const updated = await bountyHunterApi.rerollTarget(hunt.id);
    setHunt(updated);
    success("New secret target set", "");
  });

  const handleSaveSetup = () => hunt && withAction(async () => {
    let updated = hunt;
    const t = Number(setupTarget), z = Number(setupClaimZone), p = Number(setupPot);
    if (t > 0 && t !== updated.target) updated = await bountyHunterApi.setTarget(hunt.id, t);
    if (z > 0 && z !== updated.claimZone) updated = await bountyHunterApi.setClaimZone(hunt.id, z);
    if (p > 0 && p !== updated.pot) updated = await bountyHunterApi.setPot(hunt.id, p);
    setHunt(updated);
    success("Bounty setup saved", "");
  });

  const handleDeleteHistoryItem = async (id: string) => {
    if (!(await confirm({ title: "Delete this bounty?", message: "This permanently deletes it and its history. This cannot be undone.", confirmText: "Delete" }))) return;
    try {
      await bountyHunterApi.delete(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      success("Deleted", "");
    } catch (e: any) { error("Failed", e.message || "Could not delete."); }
  };

  if (!authed || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.13 0.012 70)" }}>
        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  const board = hunt ? computeBoard(hunt) : [];
  const mult = (() => {
    const b = parseFloat(baseBet), f = parseFloat(finalWin);
    if (!b || b <= 0 || isNaN(f)) return 0;
    return Math.round(f / b);
  })();
  const pendingDistance = hunt?.target !== undefined && mult > 0 ? Math.abs(mult - hunt.target) : null;
  const pendingHeat = pendingDistance !== null && hunt ? heatInfo(heatLabelOf(pendingDistance, hunt.claimZone)) : null;
  const pendingQualifies = hunt && pendingDistance !== null ? pendingDistance <= hunt.claimZone : false;
  const filteredParticipants = hunt ? hunt.entries.filter((e) => !search.trim() || e.user.displayName.toLowerCase().includes(search.trim().toLowerCase())) : [];

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "radial-gradient(ellipse at 50% -10%, oklch(0.2 0.03 60) 0%, oklch(0.13 0.012 70) 55%)", color: "oklch(0.93 0.01 70)" }}>
      <BountyHunterStyles />

      <div className="bounty-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "oklch(0.16 0.02 65 / 0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid oklch(0.4 0.07 75 / 0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, background: "linear-gradient(135deg, oklch(0.82 0.16 82), oklch(0.6 0.15 55))", clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)", boxShadow: "0 0 14px oklch(0.8 0.16 80 / 0.6)" }} />
          <div className="bounty-header-title" style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 1.5, color: "oklch(0.95 0.02 80)" }}>COMMUNITY BOUNTY HUNTER</div>
        </div>
        <a href="/bounty-hunter-widget" target="_blank" rel="noopener noreferrer" style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
          <ExternalLink size={14} /> OBS Widget
        </a>
      </div>

      <div className="bounty-main" style={{ maxWidth: 1480, margin: "0 auto", padding: 24 }}>
        {!hunt ? (
          <div className="bounty-panel" style={panelStyle}>
            <div style={panelTitleStyle}>POST A NEW BOUNTY</div>
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Entry keyword</label>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} style={smallInputStyle} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Target min ×</label>
                <input value={targetMin} onChange={(e) => setTargetMin(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Target max ×</label>
                <input value={targetMax} onChange={(e) => setTargetMax(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Claim zone ±</label>
                <input value={claimZoneInput} onChange={(e) => setClaimZoneInput(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Reward pot 🪙</label>
                <input value={potInput} onChange={(e) => setPotInput(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating} style={{ ...primaryBtnStyle, padding: "12px 28px" }}>
              {creating ? "Posting…" : "Post Bounty"}
            </button>
          </div>
        ) : (
          <div className="bounty-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr 340px", gap: 20, alignItems: "start" }}>
            {/* Column 1: registration + participants */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="bounty-panel" style={panelStyle}>
                <div style={panelTitleStyle}>REGISTRATION</div>
                <div style={{ width: "100%", padding: "10px 12px", background: "oklch(0.1 0.01 70)", border: "1px solid oklch(0.35 0.05 75 / 0.6)", borderRadius: 8, color: "oklch(0.9 0.01 70)", fontWeight: 700, marginBottom: 6, fontFamily: "'Rajdhani',sans-serif" }}>
                  {hunt.keyword}
                </div>
                <div style={{ fontSize: 11, color: "oklch(0.55 0.03 70)", marginBottom: 12 }}>
                  Viewers join with <span style={{ color: "oklch(0.82 0.1 80)" }}>{hunt.keyword} &lt;slot&gt;</span> — slot is optional at signup.
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)" }}>Hunters</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 24, color: "oklch(0.82 0.13 80)" }}>{hunt.entries.length}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)" }}>Registration</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 14, color: hunt.registrationOpen ? "oklch(0.72 0.14 165)" : "oklch(0.75 0.14 60)" }}>{hunt.registrationOpen ? "OPEN" : "CLOSED"}</div>
                  </div>
                </div>

                <button onClick={handleToggleRegistration} disabled={actionLoading} style={{ ...primaryBtnStyle, width: "100%", marginBottom: 12, background: hunt.registrationOpen ? "linear-gradient(90deg, oklch(0.6 0.16 25), oklch(0.55 0.16 10))" : "linear-gradient(90deg, oklch(0.72 0.14 165), oklch(0.65 0.14 180))" }}>
                  {hunt.registrationOpen ? "Close Registration" : "Open Registration"}
                </button>

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    value={manualUsername} onChange={(e) => setManualUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd(); }}
                    placeholder="Add by Kick username…"
                    style={{ flex: 1, padding: "9px 12px", background: "oklch(0.1 0.01 70)", border: "1px solid oklch(0.3 0.04 75 / 0.5)", borderRadius: 8, color: "oklch(0.9 0.01 70)", fontFamily: "'Rajdhani',sans-serif" }}
                  />
                  <button onClick={handleManualAdd} style={ghostBtnStyle}>Add</button>
                </div>

                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hunters…"
                  style={{ width: "100%", padding: "9px 12px", background: "oklch(0.1 0.01 70)", border: "1px solid oklch(0.3 0.04 75 / 0.5)", borderRadius: 8, color: "oklch(0.9 0.01 70)", marginBottom: 10, fontFamily: "'Rajdhani',sans-serif" }}
                />

                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {filteredParticipants.length === 0 && <p style={{ fontSize: 13, color: "oklch(0.5 0.03 70)", textAlign: "center", padding: "16px 0" }}>No hunters yet</p>}
                  {filteredParticipants.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, fontSize: 13, background: p.status === "DRAWN" ? "oklch(0.3 0.08 80 / 0.5)" : "oklch(0.13 0.015 70)", opacity: p.status === "DONE" ? 0.5 : 1 }}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.user.displayName}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: p.status === "DRAWN" ? "oklch(0.85 0.13 80)" : p.status === "DONE" ? "oklch(0.5 0.03 70)" : "oklch(0.65 0.13 145)" }}>
                          {p.status === "DRAWN" ? "PLAYING" : p.status === "DONE" ? "shot" : "ready"}
                        </span>
                        {p.status === "WAITING" && (
                          <button onClick={() => handleRemoveEntry(p.id)} style={{ color: "oklch(0.5 0.03 70)", background: "none", border: "none", cursor: "pointer" }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: arena + current turn + result entry */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <BountyArena hunt={hunt} effect={arenaEffect} />

              <div className="bounty-panel" style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ ...panelTitleStyle, marginBottom: 0 }}>CURRENT TURN</div>
                </div>

                {!currentEntry ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ fontSize: 14, color: "oklch(0.6 0.03 70)", marginBottom: 16 }}>
                      {hasWaitingEntries ? "Draw the next hunter to take a shot at the bounty." : "No eligible hunters left — waiting for more entries."}
                    </div>
                    <button onClick={handleDraw} disabled={actionLoading || !hasWaitingEntries} style={{ ...primaryBtnStyle, padding: "12px 28px", fontSize: 16, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, opacity: !hasWaitingEntries ? 0.4 : 1 }}>
                      🎲 Draw Next Hunter
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                      {currentEntry.user.avatarUrl ? (
                        <img src={currentEntry.user.avatarUrl} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, color: "oklch(0.98 0 0)", background: "oklch(0.5 0.14 80)" }}>
                          {currentEntry.user.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 20 }}>{currentEntry.user.displayName}</div>
                        <div style={{ fontSize: 13, color: "oklch(0.6 0.03 70)" }}>Locked in · ready to play</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", marginBottom: 8 }}>
                      Slot from <span style={{ color: "oklch(0.85 0.01 70)" }}>!bounty &lt;slot&gt;</span> or <span style={{ color: "oklch(0.85 0.01 70)" }}>!slot &lt;name&gt;</span> — override if needed:
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <SlotPicker value={currentRound?.slotName ?? ""} onChange={(name) => name && handlePickSlot(name)} placeholder="Search or type a slot…" />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <button onClick={handleSkipPlayer} style={{ ...ghostBtnStyleRed, flex: 1 }}>Skip Hunter</button>
                    </div>

                    <div style={{ height: 1, background: "oklch(0.3 0.03 70 / 0.4)", margin: "16px 0" }} />

                    <div style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", marginBottom: 14 }}>
                      Playing: <span style={{ color: "oklch(0.85 0.13 80)", fontWeight: 700 }}>{currentRound?.slotName ?? "waiting for slot choice…"}</span>
                    </div>

                    <div className="bounty-bet-row" style={{ display: "flex", gap: 14, marginBottom: 16, opacity: currentRound?.slotName ? 1 : 0.4, pointerEvents: currentRound?.slotName ? "auto" : "none" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Base Bet</label>
                        <input value={baseBet} onChange={(e) => setBaseBet(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.20" style={numInputStyle} />
                      </div>
                      <div className="bounty-bet-divider" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 10, fontSize: 20, color: "oklch(0.5 0.03 70)" }}>÷</div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 6 }}>Final Win</label>
                        <input value={finalWin} onChange={(e) => setFinalWin(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="20.00" style={numInputStyle} />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "oklch(0.11 0.01 70)", border: "1px solid oklch(0.35 0.05 75 / 0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)", letterSpacing: 1 }}>SHOT MULTIPLIER</div>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 28, color: "oklch(0.92 0.02 80)" }}>{mult.toLocaleString()}×</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)", letterSpacing: 1 }}>DISTANCE FROM TARGET</div>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 28, color: pendingHeat?.color ?? "oklch(0.6 0.03 70)" }}>{pendingDistance !== null ? `${pendingDistance}×` : "—"}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", padding: 9, borderRadius: 8, marginBottom: 14, color: mult <= 0 ? "oklch(0.55 0.03 70)" : pendingQualifies ? "oklch(0.82 0.15 80)" : "oklch(0.66 0.1 230)", background: mult <= 0 ? "oklch(0.13 0.01 70)" : pendingQualifies ? "oklch(0.28 0.07 80 / 0.4)" : "oklch(0.2 0.04 230 / 0.3)", border: `1px solid ${mult <= 0 ? "oklch(0.3 0.03 70 / 0.4)" : pendingQualifies ? "oklch(0.6 0.13 80 / 0.5)" : "oklch(0.4 0.08 230 / 0.4)"}` }}>
                      {mult <= 0 ? "Enter a bet and win to compute the shot." : pendingQualifies ? "✓ WITHIN CLAIM ZONE — this shot qualifies for the bounty" : `✗ Outside the ±${hunt.claimZone}× claim zone`}
                    </div>

                    <button onClick={handleSubmitRound} disabled={!currentRound?.slotName || actionLoading} style={{ ...primaryBtnStyle, width: "100%", padding: 13, fontSize: 15, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, opacity: !currentRound?.slotName ? 0.4 : 1 }}>
                      Record Shot →
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Column 3: bounty setup + status + board + history */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="bounty-panel" style={panelStyle}>
                <div style={panelTitleStyle}>BOUNTY SETUP <span style={{ color: "oklch(0.6 0.16 30)", fontSize: 10 }}>· ADMIN ONLY</span></div>
                <div style={{ background: "oklch(0.11 0.01 70)", border: "1px solid oklch(0.6 0.13 30 / 0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.62 0.04 70)" }}>🔒 SECRET TARGET</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 34, color: "oklch(0.85 0.16 80)" }}>{hunt.target}×</div>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 5 }}>Set Target ×</label>
                    <input value={setupTarget} onChange={(e) => setSetupTarget(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 5 }}>Claim Zone ±</label>
                    <input value={setupClaimZone} onChange={(e) => setSetupClaimZone(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: "oklch(0.6 0.03 70)", display: "block", marginBottom: 5 }}>Reward Pot 🪙</label>
                  <input value={setupPot} onChange={(e) => setSetupPot(e.target.value.replace(/[^0-9]/g, ""))} style={smallInputStyle} />
                </div>
                <button onClick={handleSaveSetup} disabled={actionLoading} style={{ ...primaryBtnStyle, width: "100%", marginBottom: 8 }}>💾 Save Setup</button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleRerollTarget} style={ghostBtnStyle}>🎲 Random Target</button>
                  <button onClick={handleSettleBounty} style={{ ...ghostBtnStyle, border: "none", background: "linear-gradient(90deg, oklch(0.8 0.14 80), oklch(0.66 0.15 55))", color: "oklch(0.12 0.01 70)", fontWeight: 800 }}>🎯 Settle Bounty</button>
                </div>
                <button onClick={handleForceRollover} style={{ padding: 9, borderRadius: 8, border: "1px solid oklch(0.45 0.1 230 / 0.5)", background: "oklch(0.2 0.04 230 / 0.35)", color: "oklch(0.75 0.11 230)", fontWeight: 700, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontSize: 13, width: "100%", marginTop: 8 }}>
                  🔥 Force Rollover
                </button>
              </div>

              <div className="bounty-panel" style={panelStyle}>
                <div style={panelTitleStyle}>BOUNTY STATUS</div>
                <div style={{ display: "flex", gap: 14, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)" }}>Reward</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 16, color: "oklch(0.85 0.13 82)" }}>🪙 {hunt.pot.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)" }}>Rollovers</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 16 }}>×{hunt.rolloverCount}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.03 70)" }}>Shots</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 16 }}>{board.length}</div>
                  </div>
                </div>
              </div>

              <BountyBoard rows={board} lastScoredRoundId={lastScoredRoundId} />

              <div className="bounty-panel" style={panelStyle}>
                <div style={panelTitleStyle}>BOUNTY HISTORY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {history.length === 0 && <div style={{ fontSize: 12, color: "oklch(0.5 0.03 70)" }}>No bounties settled yet.</div>}
                  {history.map((h) => {
                    const winner = h.rounds.find((r) => r.entryId === h.winnerEntryId && r.qualifies);
                    return (
                      <div key={h.id} style={{ padding: "8px 10px", background: "oklch(0.13 0.015 70)", borderRadius: 6, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ whiteSpace: "nowrap" }}>{h.target}×</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ color: "oklch(0.6 0.03 70)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{winner ? `${winner.user.displayName} · 🪙 ${h.pot.toLocaleString()}` : "—"}</span>
                          <button onClick={() => handleDeleteHistoryItem(h.id)} style={{ color: "oklch(0.5 0.03 70)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {completedHunt && (
        <ClaimOverlay
          hunt={completedHunt}
          onClose={() => { setCompletedHunt(null); loadHistory(); }}
        />
      )}
      {dialog}
    </div>
  );
}

function heatLabelOf(distance: number, claimZone: number): string {
  if (distance === 0) return "BULLSEYE";
  if (distance <= claimZone * 0.25) return "SCORCHING";
  if (distance <= claimZone * 0.6) return "RED HOT";
  if (distance <= claimZone) return "IN THE ZONE";
  if (distance <= claimZone * 2.5) return "COLD";
  return "ICE COLD";
}
