"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ImageOff, Zap, BookOpen, HelpCircle, X } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { CURRENCY_SYMBOLS, type BadgeType } from "@/lib/huntTracker";

/* ── Types ───────────────────────────────────────────────── */
interface LiveBonus {
  id: string;
  slotName: string;
  provider: string;
  image: string;
  betSize: number;
  payout: number | null;
  badge: BadgeType;
  customBadge?: string;
}

interface LiveHunt {
  id: string;
  name: string;
  date: string;
  currency: string;
  startCost: number;
  status: "collecting" | "opening" | "completed";
  isStarted: boolean;
  bonuses: LiveBonus[];
  publishedAt: string;
}

/* ── Badge pill ──────────────────────────────────────────── */
const BADGE_CFG: Record<BadgeType, { label: string; cls: string }> = {
  none:         { label: "",          cls: "" },
  super_bonus:  { label: "SUPER",     cls: "bg-amber-500/20 text-amber-400 border border-amber-500/40" },
  five_scatter: { label: "5 SCATTER", cls: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
  custom:       { label: "CUSTOM",    cls: "bg-violet-500/20 text-violet-400 border border-violet-500/40" },
};

function BadgePill({ badge, custom }: { badge: BadgeType; custom?: string }) {
  const cfg = BADGE_CFG[badge];
  if (badge === "none") return null;
  const label = badge === "custom" && custom ? custom.toUpperCase() : cfg.label;
  return <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${cfg.cls}`}>{label}</span>;
}

/* ── Slot image ──────────────────────────────────────────── */
function SlotImg({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  return err || !src ? (
    <div className="w-10 h-10 rounded-lg bg-[#1a1535] border border-white/8 flex items-center justify-center shrink-0">
      <ImageOff className="w-4 h-4 text-gray-700" />
    </div>
  ) : (
    <img src={src} alt={alt} onError={() => setErr(true)} className="w-10 h-10 rounded-lg object-cover shrink-0" />
  );
}

/* ── Status badge ────────────────────────────────────────── */
function StatusBadge({ hunt }: { hunt: LiveHunt }) {
  const opened = hunt.bonuses.filter((b) => b.payout !== null).length;
  const total = hunt.bonuses.length;

  if (!hunt.isStarted) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-violet-400 bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> COLLECTING
      </span>
    );
  }
  if (opened < total) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> OPENING
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold text-gold-400 bg-gold-500/15 border border-gold-500/30 px-3 py-1 rounded-full">
      COMPLETED
    </span>
  );
}

/* ── How to Play modal ───────────────────────────────────── */
function HowToPlayModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const steps = [
    {
      step: "Tune In on Friday",
      body: "Bonus Hunt streams happen every Friday. Make sure you're watching live on Kick so you can see the bonuses being collected and opened in real time.",
    },
    {
      step: "Slots Are Collected",
      body: "Throughout the stream, bonuses are bought and saved. Each slot appears in this list with its bet size. Payouts show as "–" until that bonus is opened.",
    },
    {
      step: "The Reveal Begins",
      body: "Once collection is done, Matty opens every saved bonus one by one. Watch the payouts and multipliers fill in live — green means profit, red means a dead bonus.",
    },
    {
      step: "Watch the Stats Update",
      body: "The Profit card at the top updates as each bonus is opened. A green number means the hunt is in profit; red means it's still chasing the start cost.",
    },
    {
      step: "Community Reactions",
      body: "Join the stream chat on Kick and react live as each bonus opens. Big multipliers mean big moments for the whole community!",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f0c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎮</span>
            <h2 className="text-base font-bold text-white">How to Play</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-white/70 leading-relaxed">
          {steps.map(({ step, body }, i) => (
            <div key={i}>
              <p className="text-yellow-400 font-bold mb-1.5 text-xs uppercase tracking-widest">
                Step {i + 1} — {step}
              </p>
              <p>{body}</p>
            </div>
          ))}
          <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-xl p-4">
            <p className="text-yellow-300 font-bold text-xs uppercase tracking-widest mb-2">💡 Tips</p>
            <ul className="space-y-1.5 text-white/60 text-xs">
              {[
                "This page auto-refreshes every 8 seconds — no need to reload",
                "Green payout = profit on that bonus · Red = loss",
                "The highlighted row shows the next bonus to be opened",
                "Watch the stream live for the full experience!",
              ].map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
          <p className="text-white/40 text-xs border-t border-white/5 pt-4">
            Bonus Hunt streams take place every Friday 🏆
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Rules modal ─────────────────────────────────────────── */
function RulesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f0c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <h2 className="text-base font-bold text-white">Rules</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-white/70 leading-relaxed">
          <p className="text-white/90">
            The Bonus Hunt is a community event where bonuses are collected throughout the stream and opened during the reveal. Here&apos;s how it works:
          </p>

          <div>
            <p className="text-white font-bold mb-3 text-xs uppercase tracking-widest">The Flow</p>
            <ol className="space-y-2.5">
              {[
                "Bonuses are bought and saved throughout the stream",
                "Once collection ends, the reveal begins — bonuses are opened one by one",
                "Each bonus pays out based on its multiplier × bet size",
                "The hunt is profitable if total winnings exceed the start cost",
                "Every bonus counts — even a single huge multiplier can flip the hunt",
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-violet-400 font-bold shrink-0 w-4">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Understanding the Stats</p>
            <ul className="space-y-2">
              {[
                { label: "Start Cost", desc: "Total amount spent buying all the bonuses" },
                { label: "Profit", desc: "Total winnings minus the start cost — green = in profit, red = loss" },
                { label: "Multi", desc: "Payout ÷ bet size for each individual bonus" },
                { label: "OPENING status", desc: "The hunt reveal is in progress — payouts are being entered live" },
              ].map(({ label, desc }) => (
                <li key={label} className="flex gap-2">
                  <span className="text-violet-400 font-semibold shrink-0">•</span>
                  <span><span className="text-white font-semibold">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/5 border border-white/8 rounded-xl p-4">
            <p className="text-white font-bold mb-2.5 text-xs uppercase tracking-widest">🎁 Community Rewards</p>
            <div className="flex flex-wrap gap-2">
              {["Website points", "Giveaway entries", "Community rewards", "Special events"].map((r) => (
                <span key={r} className="bg-white/5 border border-white/10 text-white/60 text-xs px-3 py-1 rounded-lg">{r}</span>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs border-t border-white/5 pt-4">
            Tune in every Friday for the weekly Bonus Hunt 👊
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
const POLL_INTERVAL = 8000;

export default function BonusHuntLivePage() {
  const [hunt, setHunt] = useState<LiveHunt | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showRules, setShowRules] = useState(false);

  async function fetchHunt() {
    try {
      const res = await fetch(API_ENDPOINTS.LIVE_HUNT, { cache: "no-store" });
      const data = await res.json();
      if (data.hunt) {
        setHunt(data.hunt);
        setLastUpdated(new Date());
      } else {
        setHunt(null);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHunt();
    const id = setInterval(fetchHunt, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  /* ── Computed stats ──── */
  const sym = hunt ? (CURRENCY_SYMBOLS[hunt.currency as keyof typeof CURRENCY_SYMBOLS] ?? "$") : "$";
  const openedBonuses = hunt?.bonuses.filter((b) => b.payout !== null) ?? [];
  const winnings = openedBonuses.reduce((s, b) => s + (b.payout ?? 0), 0);
  const profit = hunt ? winnings - hunt.startCost : 0;

  /* ── No live hunt ──── */
  if (!loading && !hunt) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4 flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-9 h-9 text-violet-400" />
          </div>
          <h2 className="text-white font-bold text-2xl mb-2">No Active Hunt</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
            There&apos;s no bonus hunt running right now. Check back during the next stream!
          </p>
          <Link
            href="/stream-games"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-gray-300 hover:text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Stream Games
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-400 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading hunt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Nav row */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Link
            href="/stream-games"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-gray-400 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Stream Games
          </Link>
          <button
            onClick={() => setShowHowTo(true)}
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-gray-400 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <HelpCircle className="w-4 h-4" /> How to Play
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-gray-400 hover:text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <BookOpen className="w-4 h-4" /> Rules
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── Hunt header ─────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h1 className="text-white font-bold text-2xl">{hunt!.name}</h1>
            <StatusBadge hunt={hunt!} />
          </div>

          {/* ── Top stats ───────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-white font-bold text-2xl">{hunt!.bonuses.length}</p>
              <p className="text-gray-500 text-xs mt-1">Bonuses</p>
            </div>
            <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-violet-400 font-bold text-2xl">
                {sym}{hunt!.startCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-gray-500 text-xs mt-1">Start</p>
            </div>
            <div className="bg-[#14102a]/80 border border-white/8 rounded-2xl p-4 text-center">
              <p className={`font-bold text-2xl ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {profit >= 0 ? "+" : "-"}{sym}{Math.abs(profit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-gray-500 text-xs mt-1">Profit</p>
            </div>
          </div>

          {/* ── Bonuses table ───────────────────────────────────── */}
          <div className="bg-[#0f0c1e]/80 border border-white/8 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_100px_80px] px-5 py-3 border-b border-white/6">
              <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Game</span>
              <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold text-right">Bet</span>
              <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold text-right">Payout</span>
              <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold text-right">Multi</span>
            </div>

            <AnimatePresence initial={false}>
              {hunt!.bonuses.map((bonus, i) => {
                const multi = bonus.payout !== null && bonus.betSize > 0
                  ? bonus.payout / bonus.betSize : null;
                const isProfit = bonus.payout !== null && bonus.payout > bonus.betSize;

                return (
                  <motion.div
                    key={bonus.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`grid grid-cols-[1fr_80px_100px_80px] items-center px-5 py-3.5 border-b border-white/5 last:border-0 transition-colors ${
                      bonus.payout === null && hunt!.isStarted
                        ? "bg-violet-500/5"
                        : "hover:bg-white/[0.015]"
                    }`}
                  >
                    {/* Game */}
                    <div className="flex items-center gap-3 min-w-0">
                      <SlotImg src={bonus.image} alt={bonus.slotName} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm truncate">{bonus.slotName}</span>
                          <BadgePill badge={bonus.badge} custom={bonus.customBadge} />
                        </div>
                        <p className="text-gray-500 text-xs">{bonus.provider}</p>
                      </div>
                    </div>

                    {/* Bet */}
                    <span className="text-gray-400 text-sm text-right">
                      {sym}{bonus.betSize.toFixed(2)}
                    </span>

                    {/* Payout */}
                    <span className={`text-sm font-semibold text-right ${
                      bonus.payout === null ? "text-gray-600" : isProfit ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {bonus.payout !== null
                        ? `${sym}${bonus.payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "–"
                      }
                    </span>

                    {/* Multi */}
                    <span className={`text-sm font-bold text-right ${
                      multi === null ? "text-gray-600" : isProfit ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {multi !== null ? `${multi.toFixed(2)}x` : "–"}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {hunt!.bonuses.length === 0 && (
              <div className="py-12 text-center text-gray-600 text-sm">
                No bonuses added yet — check back soon!
              </div>
            )}
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <p className="text-gray-700 text-xs text-center mt-4">
              Updates every {POLL_INTERVAL / 1000}s · Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
}
