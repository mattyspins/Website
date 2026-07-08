"use client";

import { useEffect, useState } from "react";

interface HuntBonus {
  id: string;
  slotName: string;
  provider: string;
  image: string;
  betSize: number;
  payout: number | null;
  badge: string;
  customBadge?: string;
  requestedBy?: string;
}

interface LiveHunt {
  id: string;
  name: string;
  currency: string;
  startCost: number;
  isStarted: boolean;
  isCompleted: boolean;
  bonuses: HuntBonus[];
  gtbGameId?: string;
}

interface SlotRequestEntry {
  id: string;
  slotName: string;
  kickUsername: string;
}

interface SlotRequests {
  open: boolean;
  requests: SlotRequestEntry[];
}

interface GTBWinner {
  id: string;
  displayName: string;
  avatar?: string;
  guessAmount: number;
  difference: number;
  reward: number;
}

interface GTBGame {
  id: string;
  status: string;
  finalBalance?: number;
  totalGuesses?: number;
  winner?: GTBWinner;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$" };

function sym(currency: string) { return SYMBOLS[currency] ?? "$"; }

function fmt(n: number, currency: string) {
  const s = sym(currency);
  return `${s}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCoins(n: number) {
  return n.toLocaleString("en-US");
}

function SlotImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}>
        {alt?.[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }
  return (
    <img
      src={src} alt={alt}
      onError={() => setErr(true)}
      style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

// Confetti particle positions (static to avoid hydration mismatch)
const CONFETTI = [
  { left: "8%",  top: "12%", color: "#f5a623", delay: "0s",    dur: "3s",   size: 5 },
  { left: "18%", top: "6%",  color: "#34d399", delay: "0.4s",  dur: "2.6s", size: 4 },
  { left: "30%", top: "18%", color: "#60a5fa", delay: "0.2s",  dur: "3.2s", size: 6 },
  { left: "50%", top: "5%",  color: "#f5a623", delay: "0.7s",  dur: "2.8s", size: 4 },
  { left: "65%", top: "15%", color: "#fbbf24", delay: "0.1s",  dur: "3.4s", size: 5 },
  { left: "78%", top: "8%",  color: "#34d399", delay: "0.5s",  dur: "2.5s", size: 6 },
  { left: "88%", top: "20%", color: "#f5a623", delay: "0.3s",  dur: "3.1s", size: 4 },
  { left: "12%", top: "80%", color: "#60a5fa", delay: "0.6s",  dur: "2.9s", size: 5 },
  { left: "42%", top: "88%", color: "#f5a623", delay: "0.2s",  dur: "3.3s", size: 4 },
  { left: "72%", top: "82%", color: "#fbbf24", delay: "0.8s",  dur: "2.7s", size: 6 },
  { left: "92%", top: "75%", color: "#34d399", delay: "0.4s",  dur: "3s",   size: 5 },
];

export default function BonusHuntWidget() {
  const [hunt, setHunt] = useState<LiveHunt | null>(null);
  const [gtbGame, setGtbGame] = useState<GTBGame | null>(null);
  const [slotReqs, setSlotReqs] = useState<SlotRequests | null>(null);

  // Transparent OBS background + CSS keyframes
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      html,body{background:transparent!important;margin:0;padding:0;overflow:hidden}
      @keyframes gtbSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      @keyframes gtbPulse{0%,100%{text-shadow:0 0 8px rgba(245,166,35,0.5)}50%{text-shadow:0 0 22px rgba(245,166,35,1),0 0 40px rgba(245,166,35,0.4)}}
      @keyframes gtbBounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.08)}}
      @keyframes gtbGlow{0%,100%{box-shadow:0 0 12px rgba(245,166,35,0.25),0 0 0 1px rgba(245,166,35,0.4)}50%{box-shadow:0 0 30px rgba(245,166,35,0.55),0 0 0 1px rgba(245,166,35,0.8),inset 0 0 20px rgba(245,166,35,0.04)}}
      @keyframes gtbShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      @keyframes gtbConfetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(60px) rotate(360deg);opacity:0}}
      @keyframes gtbFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes gtbRing{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.12);opacity:1}}
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Poll live hunt every 6s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/live-hunt`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setHunt(data.hunt ?? null);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 6_000);
    return () => clearInterval(id);
  }, []);

  // Poll GTB game when hunt has one linked
  useEffect(() => {
    if (!hunt?.gtbGameId) { setGtbGame(null); return; }
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/guess-the-balance/${hunt.gtbGameId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setGtbGame(data.game ?? null);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 8_000);
    return () => clearInterval(id);
  }, [hunt?.gtbGameId]);

  // Poll slot requests (public widget endpoint)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/slot-requests/widget`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) setSlotReqs({ open: data.open, requests: data.requests ?? [] });
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 6_000);
    return () => clearInterval(id);
  }, []);

  const showWinner = hunt?.isCompleted && gtbGame?.status === "COMPLETED" && !!gtbGame?.winner;

  if (!hunt) {
    return (
      <div style={{ padding: 8, fontFamily: "Inter, sans-serif" }}>
        <div style={{
          background: "rgba(10,8,22,0.85)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "10px 14px", width: 300, textAlign: "center",
        }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>No active hunt</p>
        </div>
      </div>
    );
  }

  const currency = hunt.currency;
  const s = sym(currency);
  const opened = hunt.bonuses.filter(b => b.payout !== null);
  const pending = hunt.bonuses.filter(b => b.payout === null);
  const winnings = opened.reduce((acc, b) => acc + (b.payout ?? 0), 0);
  const pnl = winnings - hunt.startCost;
  const avgBet = hunt.bonuses.length > 0
    ? hunt.bonuses.reduce((acc, b) => acc + b.betSize, 0) / hunt.bonuses.length : 0;
  const reqX = avgBet > 0 ? hunt.startCost / (hunt.bonuses.length * avgBet) : 0;
  const curX = hunt.startCost > 0 ? winnings / hunt.startCost : 0;

  const statusLabel = hunt.isCompleted ? "Completed" : hunt.isStarted ? "Opening" : "Collecting";
  const statusColor = hunt.isCompleted ? "#34d399" : hunt.isStarted ? "#fbbf24" : "#60a5fa";

  const gold = "#f5a623";
  const panel: React.CSSProperties = {
    background: "rgba(10,8,22,0.88)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
  };

  // ── GTB Winner Overlay ────────────────────────────────────
  if (showWinner) {
    const winner = gtbGame!.winner!;
    const finalBal = gtbGame!.finalBalance ?? winnings;

    return (
      <div style={{ padding: 8, fontFamily: "Inter, ui-sans-serif, sans-serif", width: 320, userSelect: "none", position: "relative" }}>
        {/* Confetti particles */}
        {CONFETTI.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: p.left, top: p.top,
            width: p.size, height: p.size, borderRadius: 2,
            background: p.color,
            animation: `gtbConfetti ${p.dur} ${p.delay} ease-in infinite`,
            pointerEvents: "none",
          }} />
        ))}

        {/* Winner card */}
        <div style={{
          ...panel,
          borderColor: "rgba(245,166,35,0.6)",
          padding: "18px 16px 16px",
          animation: "gtbGlow 2.4s ease-in-out infinite, gtbSlideUp 0.5s ease-out",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Background glow blobs */}
          <div style={{
            position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 120,
            background: "radial-gradient(ellipse, rgba(245,166,35,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Header label */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14,
          }}>
            <span style={{ color: gold, fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              🎰 Guess the Balance
            </span>
          </div>

          {/* Trophy */}
          <div style={{
            textAlign: "center", fontSize: 38, marginBottom: 6,
            animation: "gtbBounce 1.8s ease-in-out infinite",
            display: "block",
          }}>
            🏆
          </div>

          {/* WINNER! text */}
          <div style={{
            textAlign: "center", fontSize: 22, fontWeight: 900,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: gold,
            animation: "gtbPulse 2s ease-in-out infinite",
            marginBottom: 10,
          }}>
            Winner!
          </div>

          {/* Winner name */}
          <div style={{
            textAlign: "center", marginBottom: 14,
          }}>
            <span style={{
              fontSize: 16, fontWeight: 800, color: "#fff",
              background: `linear-gradient(90deg, rgba(255,255,255,0.6) 0%, #fff 40%, ${gold} 50%, #fff 60%, rgba(255,255,255,0.6) 100%)`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gtbShimmer 2.5s linear infinite",
              display: "inline-block",
            }}>
              {winner.displayName}
            </span>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(245,166,35,0.2)", marginBottom: 12 }} />

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Their Guess", value: fmt(winner.guessAmount, currency), color: gold },
              { label: "Final Balance", value: fmt(finalBal, currency), color: "#34d399" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 10px", textAlign: "center",
              }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                <div style={{ color, fontSize: 12, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Difference */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 12px", marginBottom: 10,
          }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Difference
            </span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700 }}>
              {fmt(winner.difference, currency)} off
            </span>
          </div>

          {/* Coin reward */}
          {winner.reward > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: 8, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 16 }}>🪙</span>
              <span style={{ color: gold, fontSize: 13, fontWeight: 800 }}>
                {fmtCoins(winner.reward)} coins
              </span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}>awarded</span>
            </div>
          )}

          {/* Total guesses footer */}
          {gtbGame!.totalGuesses != null && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 9 }}>
                Closest out of {gtbGame!.totalGuesses} {gtbGame!.totalGuesses === 1 ? "guess" : "guesses"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Normal hunt widget ────────────────────────────────────
  return (
    <div style={{ padding: 8, fontFamily: "Inter, ui-sans-serif, sans-serif", width: 320, userSelect: "none" }}>

      {/* ── Header ── */}
      <div style={{ ...panel, padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>🎰</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hunt.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {gtbGame && gtbGame.status === "OPEN" && (
            <span style={{
              color: "#a78bfa", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
              borderRadius: 4, padding: "1px 5px", marginRight: 4,
            }}>GTB OPEN</span>
          )}
          {gtbGame && gtbGame.status === "CLOSED" && (
            <span style={{
              color: "#fbbf24", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 4, padding: "1px 5px", marginRight: 4,
            }}>GTB CLOSED</span>
          )}
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: statusColor,
            boxShadow: hunt.isStarted && !hunt.isCompleted ? `0 0 6px ${statusColor}` : undefined,
          }} />
          <span style={{ color: statusColor, fontSize: 10, fontWeight: 600 }}>{statusLabel}</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ ...panel, padding: "8px 12px", marginBottom: 6 }}>
        {/* Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
          {[
            { label: "Start Cost", value: fmt(hunt.startCost, currency), color: "rgba(255,255,255,0.9)" },
            { label: "Winnings",   value: fmt(winnings, currency),        color: "rgba(255,255,255,0.9)" },
            { label: "P&L",        value: `${pnl >= 0 ? "+" : ""}${fmt(pnl, currency)}`, color: pnl >= 0 ? "#34d399" : "#f87171" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
              <div style={{ color, fontSize: 11, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
        {/* Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
          {[
            { label: "Opened",    value: `${opened.length}/${hunt.bonuses.length}` },
            { label: "Remaining", value: pending.length.toString() },
            { label: "Req X",     value: `${reqX.toFixed(2)}x` },
            { label: "Cur X",     value: `${curX.toFixed(2)}x`, color: curX >= reqX ? "#34d399" : "#f87171" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
              <div style={{ color: color ?? "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GTB guess count (when open) ── */}
      {gtbGame && gtbGame.status === "OPEN" && gtbGame.totalGuesses != null && (
        <div style={{
          ...panel, padding: "6px 12px", marginBottom: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderColor: "rgba(167,139,250,0.25)",
        }}>
          <span style={{ color: "#a78bfa", fontSize: 10, fontWeight: 700 }}>🎯 Guess the Balance</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>
            {gtbGame.totalGuesses} {gtbGame.totalGuesses === 1 ? "guess" : "guesses"} · !guess &lt;amount&gt;
          </span>
        </div>
      )}

      {/* ── Slot Requests ── */}
      {slotReqs && (slotReqs.open || slotReqs.requests.length > 0) && (
        <div style={{ ...panel, padding: "6px 10px", marginBottom: 6, borderColor: "rgba(99,102,241,0.25)" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: slotReqs.requests.length > 0 ? 5 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10 }}>📨</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Slot Requests
              </span>
            </div>
            {slotReqs.open ? (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
                <span style={{ color: "#4ade80", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Open</span>
              </div>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Closed</span>
            )}
          </div>

          {/* Request list */}
          {slotReqs.requests.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {slotReqs.requests.slice(0, 6).map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: "#818cf8", fontSize: 9, fontWeight: 700, flexShrink: 0, minWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{r.kickUsername}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, flexShrink: 0 }}>→</span>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.slotName}
                  </span>
                </div>
              ))}
              {slotReqs.requests.length > 6 && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, marginTop: 1 }}>
                  +{slotReqs.requests.length - 6} more
                </span>
              )}
            </div>
          ) : slotReqs.open ? (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, marginTop: 2 }}>
              Type !sr &lt;slot name&gt; in chat to request
            </div>
          ) : null}
        </div>
      )}

      {/* ── Bonus list ── */}
      {hunt.bonuses.length > 0 && (
        <div style={{ ...panel, padding: "6px 0" }}>
          {hunt.bonuses.map((b, i) => {
            const isOpen = b.payout !== null;
            const mult = isOpen && b.betSize > 0 ? b.payout! / b.betSize : null;
            const isHighMult = mult !== null && mult >= 100;
            return (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "3px 10px",
                borderBottom: i < hunt.bonuses.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                opacity: isOpen ? 1 : 0.45,
              }}>
                {/* Dot */}
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: isOpen ? "#34d399" : "rgba(255,255,255,0.15)",
                }} />

                {/* Image */}
                <SlotImage src={b.image} alt={b.slotName} />

                {/* Name + provider / requester */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: isOpen ? "#fff" : "rgba(255,255,255,0.55)",
                    fontSize: 10, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {b.slotName}
                  </div>
                  <div style={{ fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.requestedBy ? (
                      <span style={{ color: "#818cf8", fontWeight: 700 }}>@{b.requestedBy}</span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>{b.provider}</span>
                    )}
                  </div>
                </div>

                {/* Bet size */}
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, flexShrink: 0 }}>
                  {fmt(b.betSize, currency)}
                </div>

                {/* Payout + Mult stacked */}
                <div style={{ width: 52, textAlign: "right", flexShrink: 0 }}>
                  {isOpen && mult !== null ? (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.2 }}>
                        {fmt(b.payout!, currency)}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: isHighMult ? gold : "#34d399", lineHeight: 1.2 }}>
                        {mult >= 1000 ? `${(mult / 1000).toFixed(1)}k` : Math.round(mult)}x
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>–</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
