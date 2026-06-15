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
}

interface LiveHunt {
  id: string;
  name: string;
  currency: string;
  startCost: number;
  isStarted: boolean;
  isCompleted: boolean;
  bonuses: HuntBonus[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$" };

function sym(currency: string) { return SYMBOLS[currency] ?? "$"; }

function fmt(n: number, currency: string) {
  const s = sym(currency);
  return `${s}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function BonusHuntWidget() {
  const [hunt, setHunt] = useState<LiveHunt | null>(null);

  // Transparent OBS background
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "html,body{background:transparent!important;margin:0;padding:0;overflow:hidden}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_URL}/api/live-hunt`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setHunt(data.hunt ?? null);
      } catch { /* ignore */ }
    };
    fetch_();
    const id = setInterval(fetch_, 6_000);
    return () => clearInterval(id);
  }, []);

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

  const opened = hunt.bonuses.filter(b => b.payout !== null);
  const pending = hunt.bonuses.filter(b => b.payout === null);
  const winnings = opened.reduce((s, b) => s + (b.payout ?? 0), 0);
  const pnl = winnings - hunt.startCost;
  const avgBet = hunt.bonuses.length > 0
    ? hunt.bonuses.reduce((s, b) => s + b.betSize, 0) / hunt.bonuses.length : 0;
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
            { label: "Start Cost", value: fmt(hunt.startCost, hunt.currency), color: "rgba(255,255,255,0.9)" },
            { label: "Winnings",   value: fmt(winnings, hunt.currency),        color: "rgba(255,255,255,0.9)" },
            { label: "P&L",        value: `${pnl >= 0 ? "+" : ""}${fmt(pnl, hunt.currency)}`, color: pnl >= 0 ? "#34d399" : "#f87171" },
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
            { label: "Opened", value: `${opened.length}/${hunt.bonuses.length}` },
            { label: "Remaining", value: pending.length.toString() },
            { label: "Req X",  value: `${reqX.toFixed(2)}x` },
            { label: "Cur X",  value: `${curX.toFixed(2)}x`, color: curX >= reqX ? "#34d399" : "#f87171" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
              <div style={{ color: color ?? "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bonus list ── */}
      {hunt.bonuses.length > 0 && (
        <div style={{ ...panel, padding: "6px 0", maxHeight: 340, overflow: "hidden" }}>
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

                {/* Name + provider */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: isOpen ? "#fff" : "rgba(255,255,255,0.55)",
                    fontSize: 10, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {b.slotName}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9 }}>{b.provider}</div>
                </div>

                {/* Bet */}
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, flexShrink: 0 }}>
                  {fmt(b.betSize, hunt.currency)}
                </div>

                {/* Mult */}
                <div style={{ width: 36, textAlign: "right", flexShrink: 0 }}>
                  {mult !== null ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: isHighMult ? gold : "#34d399",
                    }}>
                      {mult >= 1000 ? `${(mult / 1000).toFixed(1)}k` : Math.round(mult)}x
                    </span>
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
