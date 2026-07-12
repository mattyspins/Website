"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { bossRaidApi, BossRaid, BossConfig, BossKey } from "@/lib/api/bossRaid";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/admin/useConfirm";
import { QUICK_SLOTS, computeLeaderboard } from "@/lib/bossRaidVisuals";
import BossRaidStyles from "@/components/bossRaid/BossRaidStyles";
import BossArena, { ArenaEffect } from "@/components/bossRaid/BossArena";
import { Leaderboard } from "@/components/bossRaid/Leaderboard";
import VictoryOverlay from "@/components/bossRaid/VictoryOverlay";
import { ExternalLink, Trash2 } from "lucide-react";

const panelStyle: CSSProperties = { background: "oklch(0.17 0.02 260 / 0.7)", backdropFilter: "blur(8px)", border: "1px solid oklch(0.32 0.04 220 / 0.35)", borderRadius: 14, padding: 20 };
const panelTitleStyle: CSSProperties = { fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2, color: "oklch(0.7 0.1 220)", marginBottom: 14 };
const primaryBtnStyle: CSSProperties = { padding: "10px 14px", borderRadius: 8, border: "none", background: "linear-gradient(90deg, oklch(0.72 0.14 220), oklch(0.6 0.14 250))", color: "oklch(0.1 0.01 260)", fontWeight: 800, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontSize: 14 };
const ghostBtnStyle: CSSProperties = { flex: 1, padding: 9, borderRadius: 8, border: "1px solid oklch(0.4 0.06 220 / 0.5)", background: "transparent", color: "oklch(0.8 0.05 220)", fontWeight: 700, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif" };
const ghostBtnStyleRed: CSSProperties = { ...ghostBtnStyle, border: "1px solid oklch(0.5 0.15 25 / 0.5)", color: "oklch(0.72 0.15 25)" };
const numInputStyle: CSSProperties = { width: "100%", padding: 12, background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.35 0.04 250 / 0.6)", borderRadius: 8, color: "oklch(0.95 0.01 260)", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 18 };

function critMultFor(boss: BossKey, voidModifier: string | null): number {
  if (boss === "storm") return 3;
  if (boss === "void" && voidModifier === "retrigger3x") return 3;
  if (boss === "void" && voidModifier === "doublecrit") return 4;
  return 2;
}

export default function AdminBossRaidPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { confirm, dialog } = useConfirm();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [roster, setRoster] = useState<BossConfig[]>([]);
  const [raid, setRaid] = useState<BossRaid | null>(null);
  const [completedRaid, setCompletedRaid] = useState<BossRaid | null>(null);
  const [history, setHistory] = useState<BossRaid[]>([]);

  const [selectedBoss, setSelectedBoss] = useState<BossKey>("mecha");
  const [keyword, setKeyword] = useState("!monster");
  const [maxHp, setMaxHp] = useState("10000");
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [baseBet, setBaseBet] = useState("");
  const [finalWin, setFinalWin] = useState("");
  const [isRetrigger, setIsRetrigger] = useState(false);
  const [arenaEffect, setArenaEffect] = useState<ArenaEffect | null>(null);
  const [lastScoredEntryId, setLastScoredEntryId] = useState<string | null>(null);

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
      const all = await bossRaidApi.getAll();
      setHistory(all.filter((r) => r.status === "COMPLETED"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const [r, active] = await Promise.all([bossRaidApi.getRoster(), bossRaidApi.getActive()]);
        setRoster(r);
        setRaid(active);
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
    if (!authed || !raid) return;
    const socket = getSocket();
    socket.emit("joinBossRaid", raid.id);
    const onUpdate = (updated: BossRaid) => {
      if (updated.status !== "COMPLETED") {
        setRaid((prev) => (prev && updated.id === prev.id ? updated : prev));
      } else if (raid.id === updated.id) {
        setRaid(null);
        setCompletedRaid(updated);
        setHistory((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
      }
    };
    socket.on("bossraid:updated", onUpdate);
    return () => {
      socket.emit("leaveBossRaid", raid.id);
      socket.off("bossraid:updated", onUpdate);
    };
  }, [authed, raid?.id]);

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
    if (!keyword.trim()) { error("Keyword required", "Enter an entry keyword, e.g. !monster"); return; }
    setCreating(true);
    try {
      const hp = Number(maxHp) || 10000;
      const created = await bossRaidApi.create(selectedBoss, keyword.trim(), hp);
      setRaid(created);
      setCompletedRaid(null);
      success("Raid started", `Viewers can now type "${created.keyword}" in chat to join.`);
    } catch (e: any) {
      error("Failed", e.message || "Could not start raid.");
    } finally { setCreating(false); }
  };

  const handleCloseRegistration = () => raid && withAction(async () => setRaid(await bossRaidApi.closeRegistration(raid.id)));

  const handleManualAdd = async () => {
    if (!raid || !manualUsername.trim()) return;
    const updated = await withAction(() => bossRaidApi.addEntry(raid.id, manualUsername.trim()));
    if (updated) { setRaid(updated); setManualUsername(""); }
  };

  const handleRemoveEntry = (entryId: string) => withAction(async () => setRaid(await bossRaidApi.removeEntry(entryId)));

  const handleDraw = () => raid && withAction(async () => setRaid(await bossRaidApi.draw(raid.id)));

  const currentEntry = useMemo(() => raid?.entries.find((e) => e.status === "DRAWN") ?? null, [raid]);

  const handlePickSlot = (slotName: string) => currentEntry && withAction(async () => setRaid(await bossRaidApi.setSlot(currentEntry.id, slotName)));
  const handleAutoSelectSlot = () => handlePickSlot(QUICK_SLOTS[Math.floor(Math.random() * QUICK_SLOTS.length)].name);
  const handleSkipPlayer = () => currentEntry && withAction(async () => {
    const updated = await bossRaidApi.skipPlayer(currentEntry.id);
    setRaid(updated);
    setBaseBet(""); setFinalWin(""); setIsRetrigger(false);
  });

  const triggerEffect = (bannerText: string | null, flashColor: string | null, shake: boolean) => {
    setArenaEffect({ key: Date.now(), bannerText, flashColor, shake });
  };

  const handleDeadBonus = () => currentEntry && withAction(async () => {
    const result = await bossRaidApi.submitDeadBonus(currentEntry.id);
    setRaid(result.raid);
    setLastScoredEntryId(currentEntry.id);
    triggerEffect(result.bannerText, "oklch(0.35 0.08 290 / 0.5)", false);
    setBaseBet(""); setFinalWin(""); setIsRetrigger(false);
  });

  const handleSubmitRound = () => currentEntry && withAction(async () => {
    const bet = parseFloat(baseBet);
    const win = parseFloat(finalWin);
    if (!(bet > 0) || isNaN(win)) { error("Invalid entry", "Enter a valid base bet and final win."); return; }
    const result = await bossRaidApi.submitRound(currentEntry.id, bet, win, isRetrigger);
    setRaid(result.raid);
    setLastScoredEntryId(currentEntry.id);
    const flash = result.isLegendary ? "oklch(0.85 0.16 85 / 0.55)" : result.isStunThreshold ? "oklch(0.75 0.14 220 / 0.4)" : null;
    triggerEffect(result.bannerText, flash, true);
    if (result.defeated) {
      setCompletedRaid(result.raid);
      setRaid(null);
    }
    setBaseBet(""); setFinalWin(""); setIsRetrigger(false);
  });

  const handleEndRaid = async () => {
    if (!raid) return;
    if (!(await confirm({ title: "End this raid?", message: "The raid will conclude and current top contributors will be rewarded.", confirmText: "End Raid", confirmColor: "yellow" }))) return;
    const updated = await withAction(() => bossRaidApi.endRaid(raid.id));
    if (updated) { setCompletedRaid(updated); setRaid(null); }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!(await confirm({ title: "Delete this raid?", message: "This permanently deletes it and its history. This cannot be undone.", confirmText: "Delete" }))) return;
    try {
      await bossRaidApi.delete(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
      success("Deleted", "");
    } catch (e: any) { error("Failed", e.message || "Could not delete."); }
  };

  if (!authed || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.13 0.015 260)" }}>
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  const leaderboard = raid ? computeLeaderboard(raid) : [];
  const critMult = raid ? critMultFor(raid.bossKey, raid.voidModifier) : 2;
  const mult = (() => {
    const b = parseFloat(baseBet), f = parseFloat(finalWin);
    if (!b || b <= 0 || isNaN(f)) return 0;
    return Math.round((f / b) * 100) / 100;
  })();
  const pendingDamage = mult > 0 ? (isRetrigger ? Math.round(mult * critMult * 100) / 100 : mult) : 0;
  const filteredParticipants = raid ? raid.entries.filter((e) => !search.trim() || e.user.displayName.toLowerCase().includes(search.trim().toLowerCase())) : [];

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "radial-gradient(ellipse at 50% -10%, oklch(0.22 0.03 250) 0%, oklch(0.13 0.015 260) 55%)", color: "oklch(0.93 0.01 260)" }}>
      <BossRaidStyles />

      <div className="boss-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "oklch(0.16 0.02 260 / 0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid oklch(0.35 0.05 220 / 0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, background: "linear-gradient(135deg, oklch(0.75 0.15 220), oklch(0.5 0.15 250))", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", boxShadow: "0 0 14px oklch(0.75 0.15 220 / 0.6)" }} />
          <div className="boss-header-title" style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 1.5, color: "oklch(0.95 0.01 260)" }}>COMMUNITY BOSS RAID</div>
        </div>
        <a href="/boss-raid-widget" target="_blank" rel="noopener noreferrer" style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
          <ExternalLink size={14} /> OBS Widget
        </a>
      </div>

      <div className="boss-main" style={{ maxWidth: 1480, margin: "0 auto", padding: 24 }}>
        {!raid ? (
          <div className="boss-panel" style={panelStyle}>
            <div style={panelTitleStyle}>START A NEW RAID</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", marginBottom: 8 }}>Choose a boss</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {roster.map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setSelectedBoss(b.key)}
                    style={{
                      padding: "12px 10px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                      border: `1px solid ${b.key === selectedBoss ? `oklch(0.6 0.13 ${b.hue} / 0.8)` : "oklch(0.3 0.03 260 / 0.4)"}`,
                      background: b.key === selectedBoss ? `oklch(0.24 0.08 ${b.hue} / 0.5)` : "oklch(0.12 0.01 260)",
                      color: "oklch(0.9 0.01 260)", fontFamily: "'Rajdhani',sans-serif",
                      boxShadow: b.key === selectedBoss ? `0 0 16px oklch(0.6 0.13 ${b.hue} / 0.3)` : "none",
                    }}
                  >
                    <div style={{ fontSize: 26 }}>{b.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)" }}>{b.passiveName}</div>
                  </button>
                ))}
              </div>
              {roster.find((b) => b.key === selectedBoss) && (
                <div style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", marginTop: 10, lineHeight: 1.4 }}>
                  {roster.find((b) => b.key === selectedBoss)!.description}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", display: "block", marginBottom: 6 }}>Entry keyword</label>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.35 0.04 250 / 0.6)", borderRadius: 8, color: "oklch(0.9 0.01 260)", fontWeight: 700, fontFamily: "'Rajdhani',sans-serif" }} />
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <label style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", display: "block", marginBottom: 6 }}>Boss HP</label>
                <input value={maxHp} onChange={(e) => setMaxHp(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", padding: "10px 12px", background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.35 0.04 250 / 0.6)", borderRadius: 8, color: "oklch(0.9 0.01 260)", fontWeight: 700, fontFamily: "'Rajdhani',sans-serif" }} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating} style={{ ...primaryBtnStyle, padding: "12px 28px" }}>
              {creating ? "Starting…" : "Start Raid"}
            </button>
          </div>
        ) : (
          <div className="boss-raid-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr 340px", gap: 20, alignItems: "start" }}>
            {/* Column 1: registration + participants */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="boss-panel" style={panelStyle}>
                <div style={panelTitleStyle}>REGISTRATION</div>
                <div style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", marginBottom: 6 }}>Entry keyword</div>
                <div style={{ width: "100%", padding: "10px 12px", background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.35 0.04 250 / 0.6)", borderRadius: 8, color: "oklch(0.9 0.01 260)", fontWeight: 700, marginBottom: 12, fontFamily: "'Rajdhani',sans-serif" }}>
                  {raid.keyword}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)" }}>Participants</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 24, color: "oklch(0.8 0.13 220)" }}>{raid.entries.length}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)" }}>Status</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 14, color: raid.status === "REGISTRATION" ? "oklch(0.75 0.14 60)" : "oklch(0.72 0.14 165)" }}>{raid.status}</div>
                  </div>
                </div>

                {raid.status === "REGISTRATION" && (
                  <button onClick={handleCloseRegistration} disabled={actionLoading} style={{ ...primaryBtnStyle, width: "100%", marginBottom: 12, background: "linear-gradient(90deg, oklch(0.6 0.16 25), oklch(0.55 0.16 10))" }}>
                    Close Registration
                  </button>
                )}

                {raid.status === "REGISTRATION" && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      value={manualUsername} onChange={(e) => setManualUsername(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleManualAdd(); }}
                      placeholder="Add by Kick username…"
                      style={{ flex: 1, padding: "9px 12px", background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.3 0.04 250 / 0.5)", borderRadius: 8, color: "oklch(0.9 0.01 260)", fontFamily: "'Rajdhani',sans-serif" }}
                    />
                    <button onClick={handleManualAdd} style={ghostBtnStyle}>Add</button>
                  </div>
                )}

                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search participants…"
                  style={{ width: "100%", padding: "9px 12px", background: "oklch(0.1 0.01 260)", border: "1px solid oklch(0.3 0.04 250 / 0.5)", borderRadius: 8, color: "oklch(0.9 0.01 260)", marginBottom: 10, fontFamily: "'Rajdhani',sans-serif" }}
                />

                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {filteredParticipants.length === 0 && <p style={{ fontSize: 13, color: "oklch(0.5 0.02 260)", textAlign: "center", padding: "16px 0" }}>No participants yet</p>}
                  {filteredParticipants.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 6, fontSize: 13, background: p.status === "DRAWN" ? "oklch(0.28 0.08 220 / 0.5)" : "oklch(0.13 0.015 260)", opacity: p.status === "DONE" ? 0.5 : 1 }}>
                      <span>{p.user.displayName}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: p.status === "DRAWN" ? "oklch(0.85 0.13 220)" : p.status === "DONE" ? "oklch(0.5 0.02 260)" : "oklch(0.65 0.13 145)" }}>
                          {p.status === "DRAWN" ? "PLAYING" : p.status === "DONE" ? "done" : "ready"}
                        </span>
                        {p.status === "WAITING" && raid.status === "REGISTRATION" && (
                          <button onClick={() => handleRemoveEntry(p.id)} style={{ color: "oklch(0.5 0.02 260)", background: "none", border: "none", cursor: "pointer" }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: current turn + result entry */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <BossArena raid={raid} effect={arenaEffect} />

              <div className="boss-panel" style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ ...panelTitleStyle, marginBottom: 0 }}>CURRENT TURN</div>
                </div>

                {!currentEntry ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ fontSize: 14, color: "oklch(0.6 0.02 260)", marginBottom: 16 }}>
                      {raid.status === "REGISTRATION" ? "Close registration to begin drawing players." : "No active player. Draw the next viewer to continue the raid."}
                    </div>
                    <button onClick={handleDraw} disabled={actionLoading || raid.status !== "ACTIVE"} style={{ ...primaryBtnStyle, padding: "12px 28px", fontSize: 16, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, opacity: raid.status !== "ACTIVE" ? 0.4 : 1 }}>
                      🎲 Draw Next Player
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                      {currentEntry.user.avatarUrl ? (
                        <img src={currentEntry.user.avatarUrl} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, color: "oklch(0.98 0 0)", background: "oklch(0.5 0.14 220)" }}>
                          {currentEntry.user.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 20 }}>{currentEntry.user.displayName}</div>
                        <div style={{ fontSize: 13, color: "oklch(0.6 0.02 260)" }}>Selected · turn in progress</div>
                      </div>
                    </div>

                    {(() => {
                      const round = raid.rounds.find((r) => r.entryId === currentEntry.id && !r.playedAt);
                      const activeSlot = round?.slotName;
                      return (
                        <>
                          <div style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", marginBottom: 8 }}>
                            Slot choice — <span style={{ color: "oklch(0.85 0.01 260)" }}>!slot &lt;name&gt;</span> in chat (or pick for them):
                          </div>
                          <div className="boss-slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
                            {QUICK_SLOTS.map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handlePickSlot(opt.name)}
                                style={{
                                  padding: "9px 6px", borderRadius: 8,
                                  border: `1px solid ${activeSlot === opt.name ? "oklch(0.7 0.14 220 / 0.8)" : "oklch(0.35 0.04 250 / 0.5)"}`,
                                  background: activeSlot === opt.name ? "oklch(0.28 0.08 220 / 0.5)" : "oklch(0.11 0.01 260)",
                                  color: "oklch(0.88 0.03 220)", fontWeight: 600, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontSize: 12,
                                }}
                              >
                                {opt.icon} {opt.name}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                            <button onClick={handleAutoSelectSlot} style={ghostBtnStyle}>Auto-Select Slot</button>
                            <button onClick={handleSkipPlayer} style={ghostBtnStyleRed}>Skip Player</button>
                          </div>

                          <div style={{ height: 1, background: "oklch(0.3 0.03 260 / 0.4)", margin: "16px 0" }} />

                          <div style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", marginBottom: 14 }}>
                            Playing: <span style={{ color: "oklch(0.85 0.13 220)", fontWeight: 700 }}>{activeSlot ?? "waiting for slot choice…"}</span>
                          </div>

                          <div className="boss-bet-row" style={{ display: "flex", gap: 14, marginBottom: 16, opacity: activeSlot ? 1 : 0.4, pointerEvents: activeSlot ? "auto" : "none" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", display: "block", marginBottom: 6 }}>Base Bet</label>
                              <input value={baseBet} onChange={(e) => setBaseBet(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.20" style={numInputStyle} />
                            </div>
                            <div className="boss-bet-divider" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 10, fontSize: 20, color: "oklch(0.5 0.02 260)" }}>÷</div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 12, color: "oklch(0.6 0.02 260)", display: "block", marginBottom: 6 }}>Final Win</label>
                              <input value={finalWin} onChange={(e) => setFinalWin(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="20.00" style={numInputStyle} />
                            </div>
                          </div>

                          <div className="boss-stats-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "oklch(0.11 0.01 260)", border: "1px solid oklch(0.35 0.05 220 / 0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                            <div>
                              <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)", letterSpacing: 1 }}>CALCULATED MULTIPLIER</div>
                              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 28, color: mult >= 1000 ? "oklch(0.85 0.15 85)" : mult >= 500 ? "oklch(0.8 0.15 260)" : "oklch(0.9 0.01 260)" }}>{mult}×</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: "oklch(0.6 0.02 260)", letterSpacing: 1 }}>BOSS DAMAGE</div>
                              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 28, color: "oklch(0.85 0.14 25)" }}>{pendingDamage.toLocaleString()}</div>
                            </div>
                          </div>

                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "oklch(0.75 0.01 260)", marginBottom: 14, cursor: "pointer" }}>
                            <input type="checkbox" checked={isRetrigger} onChange={(e) => setIsRetrigger(e.target.checked)} style={{ width: 16, height: 16, accentColor: "oklch(0.7 0.15 220)" }} />
                            Mark as Retrigger (Critical Hit ×{critMult})
                          </label>

                          <button onClick={handleSubmitRound} disabled={!activeSlot || actionLoading} style={{ ...primaryBtnStyle, width: "100%", padding: 13, fontSize: 15, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, background: "linear-gradient(90deg, oklch(0.65 0.18 25), oklch(0.6 0.16 15))", color: "oklch(0.98 0.01 25)", opacity: !activeSlot ? 0.4 : 1 }}>
                            Submit Result → Deal Damage
                          </button>

                          <div style={{ height: 1, background: "oklch(0.3 0.03 260 / 0.4)", margin: "16px 0" }} />

                          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "oklch(0.55 0.02 260)", marginBottom: 8 }}>SPECIAL EVENT ACTIONS</div>
                          <button onClick={handleDeadBonus} style={{ padding: 11, borderRadius: 8, border: "1px solid oklch(0.4 0.06 290 / 0.6)", background: "oklch(0.2 0.05 290 / 0.4)", color: "oklch(0.8 0.06 290)", fontWeight: 700, cursor: "pointer", fontFamily: "'Rajdhani',sans-serif", fontSize: 13, width: "100%" }}>
                            💀 Dead Bonus · +{raid.bossKey === "shadow" ? 250 : raid.bossKey === "void" && raid.voidModifier === "deadheal50" ? 50 : 100} HP
                          </button>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>

            {/* Column 3: boss status + leaderboard + history */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="boss-panel" style={panelStyle}>
                <button onClick={handleEndRaid} style={{ ...primaryBtnStyle, background: "transparent", border: "1px solid oklch(0.5 0.15 25 / 0.5)", color: "oklch(0.7 0.15 25)", width: "100%" }}>
                  End Raid
                </button>
              </div>

              <Leaderboard rows={leaderboard} lastScoredEntryId={lastScoredEntryId} />

              <div className="boss-panel" style={panelStyle}>
                <div style={panelTitleStyle}>RAID HISTORY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {history.length === 0 && <div style={{ fontSize: 12, color: "oklch(0.5 0.02 260)" }}>No raids completed yet.</div>}
                  {history.map((h) => (
                    <div key={h.id} style={{ padding: "8px 10px", background: "oklch(0.13 0.015 260)", borderRadius: 6, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{h.boss.icon} {h.boss.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "oklch(0.6 0.02 260)" }}>{h.defeated ? "Defeated" : "Ended"}</span>
                        <button onClick={() => handleDeleteHistoryItem(h.id)} style={{ color: "oklch(0.5 0.02 260)", background: "none", border: "none", cursor: "pointer" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {completedRaid && (
        <VictoryOverlay
          raid={completedRaid}
          onClose={() => { setCompletedRaid(null); loadHistory(); }}
        />
      )}
      {dialog}
    </div>
  );
}
