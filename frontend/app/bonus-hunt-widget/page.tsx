"use client";

import { useEffect, useState } from "react";

interface LiveBonus {
  id: string;
  slotName: string;
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
  status: "collecting" | "opening" | "completed";
  isStarted: boolean;
  bonuses: LiveBonus[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_CFG = {
  collecting: { label: "Collecting",  dot: "bg-blue-400",               text: "text-blue-300" },
  opening:    { label: "Opening",     dot: "bg-amber-400 animate-pulse", text: "text-amber-300" },
  completed:  { label: "Completed",   dot: "bg-green-400",               text: "text-green-300" },
} as const;

function fmt(n: number, currency: string) {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${sym}${n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtMult(bonus: LiveBonus) {
  if (bonus.payout === null) return null;
  const mult = bonus.betSize > 0 ? bonus.payout / bonus.betSize : 0;
  return `${mult.toLocaleString("en", { maximumFractionDigits: 0 })}x`;
}

export default function BonusHuntWidget() {
  const [hunt, setHunt] = useState<LiveHunt | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "html,body{background:transparent!important;margin:0;padding:0}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const fetchHunt = async () => {
    try {
      const res = await fetch(`${API_URL}/api/live-hunt`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setHunt(data.hunt ?? null);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchHunt();
    const id = setInterval(fetchHunt, 8_000);
    return () => clearInterval(id);
  }, []);

  if (!hunt) {
    return (
      <div className="p-2">
        <div className="bg-black/60 border border-white/10 rounded-lg p-4 text-center" style={{ width: 220 }}>
          <p className="text-2xl mb-1">🎰</p>
          <p className="text-white/50 text-[10px] tracking-widest uppercase">No active hunt…</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CFG[hunt.status] ?? STATUS_CFG.collecting;
  const opened = hunt.bonuses.filter(b => b.payout !== null);
  const totalPayout = opened.reduce((s, b) => s + (b.payout ?? 0), 0);
  const profit = totalPayout - hunt.startCost;
  const avgMult = hunt.startCost > 0 ? totalPayout / hunt.startCost : 0;

  return (
    <div className="p-1.5 space-y-1.5 font-sans select-none" style={{ width: 220 }}>

      {/* Header */}
      <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs shrink-0">🎰</span>
          <span className="text-white font-semibold text-[10px] truncate">{hunt.name}</span>
        </div>
        <div className={`flex items-center gap-1 shrink-0 ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span className="text-[9px] font-medium">{cfg.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-white/40 text-[9px]">{opened.length}/{hunt.bonuses.length} opened</span>
          <span className="text-white/40 text-[9px]">Start: {fmt(hunt.startCost, hunt.currency)}</span>
        </div>
        {hunt.isStarted && (
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-[9px]">Payout: {fmt(totalPayout, hunt.currency)}</span>
            <span className={`text-[10px] font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {profit >= 0 ? "+" : ""}{fmt(profit, hunt.currency)} ({avgMult.toFixed(1)}x)
            </span>
          </div>
        )}
      </div>

      {/* Bonus list */}
      <div className="bg-black/70 border border-white/10 rounded-lg px-2 py-1.5">
        <div className="space-y-0.5 max-h-[340px] overflow-hidden">
          {hunt.bonuses.map(b => {
            const mult = fmtMult(b);
            const isOpen = b.payout !== null;
            const isHighMult = mult && parseFloat(mult) >= 100;
            return (
              <div key={b.id} className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOpen ? "bg-green-400" : "bg-white/15"}`} />
                <span className={`text-[9px] truncate flex-1 ${isOpen ? "text-white/80" : "text-white/35"}`}>
                  {b.slotName}
                </span>
                <span className="text-[8px] text-white/30 shrink-0">{fmt(b.betSize, hunt.currency)}</span>
                {mult ? (
                  <span className={`text-[9px] font-bold shrink-0 w-10 text-right ${isHighMult ? "text-amber-400" : "text-green-400"}`}>
                    {mult}
                  </span>
                ) : (
                  <span className="text-[9px] text-white/20 shrink-0 w-10 text-right">–</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
