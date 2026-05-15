"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Trophy, Clock, Lock } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface Raffle {
  id: string;
  title: string;
  description?: string;
  prize: string;
  ticketPrice: number;
  maxTickets: number;
  ticketsSold: number;
  status: string;
  endsAt: string;
  isFeatured: boolean;
  numberOfWinners: number;
}

interface MyTickets {
  [raffleId: string]: number;
}

export default function RafflePage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTickets, setMyTickets] = useState<MyTickets>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [msgs, setMsgs] = useState<Record<string, { type: "success" | "error"; text: string }>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userCoins, setUserCoins] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);
    loadRaffles(token);
    if (token) loadUserInfo(token);
  }, []);

  const loadRaffles = async (token: string | null) => {
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLES, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      if (d.raffles) {
        setRaffles(d.raffles);
        const init: Record<string, number> = {};
        for (const r of d.raffles) init[r.id] = 1;
        setQuantities(init);
        if (token) loadMyTickets(token, d.raffles);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadUserInfo = async (token: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.user) setUserCoins(d.user.points);
    } catch { /* ignore */ }
  };

  const loadMyTickets = async (token: string, raffleList: Raffle[]) => {
    const result: MyTickets = {};
    await Promise.all(
      raffleList.map(async (r) => {
        try {
          const res = await fetch(API_ENDPOINTS.RAFFLE_USER_TICKETS(r.id), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          if (d.tickets) result[r.id] = d.tickets.length;
        } catch { /* ignore */ }
      })
    );
    setMyTickets(result);
  };

  const handleBuy = async (raffle: Raffle) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const qty = quantities[raffle.id] ?? 1;
    setBuying(raffle.id);
    setMsgs((m) => ({ ...m, [raffle.id]: undefined as any }));
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE_PURCHASE(raffle.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: qty }),
      });
      const d = await res.json();
      if (d.success || d.tickets) {
        const cost = raffle.ticketPrice * qty;
        setUserCoins((c) => c - cost);
        setMyTickets((m) => ({ ...m, [raffle.id]: (m[raffle.id] ?? 0) + qty }));
        setRaffles((rs) => rs.map((r) => r.id === raffle.id ? { ...r, ticketsSold: r.ticketsSold + qty } : r));
        setMsgs((m) => ({ ...m, [raffle.id]: { type: "success", text: `${qty} ticket${qty > 1 ? "s" : ""} purchased!` } }));
        window.dispatchEvent(new Event("coins-updated"));
      } else {
        setMsgs((m) => ({ ...m, [raffle.id]: { type: "error", text: d.error?.message || d.message || "Purchase failed." } }));
      }
    } catch {
      setMsgs((m) => ({ ...m, [raffle.id]: { type: "error", text: "Network error." } }));
    } finally { setBuying(null); }
  };

  const timeLeft = (endsAt: string) => {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return "Ended";
    const h = Math.floor(ms / 3_600_000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h left`;
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m left`;
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            Win Big
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-gaming text-white tracking-wide mb-3">
            RAFF<span className="text-gold-400">LES</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Spend your coins on tickets for a chance to win prizes. More tickets = better odds.
          </p>
          {isLoggedIn && (
            <p className="text-gold-400 font-semibold mt-3">
              Your balance: <span className="font-gaming">{userCoins.toLocaleString()}</span> coins
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-navy-800/40 border border-white/5 rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : raffles.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No active raffles right now.</p>
            <p className="text-gray-600 text-sm mt-1">Check back soon — new raffles are added regularly.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {raffles.map((raffle, i) => {
              const pct = Math.min((raffle.ticketsSold / raffle.maxTickets) * 100, 100);
              const myCount = myTickets[raffle.id] ?? 0;
              const qty = quantities[raffle.id] ?? 1;
              const totalCost = raffle.ticketPrice * qty;
              const canAfford = userCoins >= totalCost;
              const isSoldOut = raffle.ticketsSold >= raffle.maxTickets;
              const msg = msgs[raffle.id];

              return (
                <motion.div
                  key={raffle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-navy-800/60 border rounded-xl p-5 flex flex-col ${raffle.isFeatured ? "border-gold-500/30" : "border-white/6"}`}
                >
                  {raffle.isFeatured && (
                    <span className="text-xs font-bold text-gold-400 tracking-widest uppercase mb-2">⭐ Featured</span>
                  )}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-white font-semibold leading-snug">{raffle.title}</h3>
                    <div className="shrink-0 bg-gold-500/10 border border-gold-500/20 rounded-lg px-2.5 py-1 text-center">
                      <p className="text-gold-400 font-bold text-sm leading-none">{raffle.ticketPrice}</p>
                      <p className="text-gray-600 text-[10px]">coins</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-gold-400 shrink-0" />
                    <p className="text-gray-300 text-sm font-medium">{raffle.prize}</p>
                  </div>
                  {raffle.description && (
                    <p className="text-gray-500 text-xs mb-3 leading-relaxed">{raffle.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{timeLeft(raffle.endsAt)}</span>
                    {raffle.numberOfWinners > 1 && (
                      <span className="ml-auto text-gold-500/70">{raffle.numberOfWinners} winners</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{raffle.ticketsSold} / {raffle.maxTickets} tickets</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-navy-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {myCount > 0 && (
                    <p className="text-[#53FC18] text-xs font-semibold mb-2">
                      You have {myCount} ticket{myCount > 1 ? "s" : ""}
                    </p>
                  )}

                  {msg && (
                    <p className={`text-xs mb-2 ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
                  )}

                  {/* Buy controls */}
                  <div className="mt-auto">
                    {!isLoggedIn ? (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Login to buy tickets</span>
                      </div>
                    ) : isSoldOut ? (
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Sold Out</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={qty}
                          onChange={(e) => setQuantities((q) => ({ ...q, [raffle.id]: Number(e.target.value) }))}
                          className="bg-navy-900/60 border border-white/8 rounded-lg px-2 py-2 text-white text-sm focus:outline-none w-16"
                        >
                          {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button
                          onClick={() => handleBuy(raffle)}
                          disabled={buying === raffle.id || !canAfford}
                          className="flex-1 bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-white font-bold py-2 rounded-lg text-xs tracking-wider uppercase transition-all"
                        >
                          {buying === raffle.id ? "..." : `Buy · ${totalCost} coins`}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-12 bg-navy-800/40 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">How Raffles Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">01</span>
              <div>
                <p className="text-gray-300 font-medium">Buy Tickets</p>
                <p>Spend coins to enter. Each ticket gives you one entry into the draw.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">02</span>
              <div>
                <p className="text-gray-300 font-medium">Wait for the Draw</p>
                <p>When the raffle ends, a winner is selected at random from all entries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">03</span>
              <div>
                <p className="text-gray-300 font-medium">Claim Your Prize</p>
                <p>Winners are announced in Discord. Open a ticket to collect your reward.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
