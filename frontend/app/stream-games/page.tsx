"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, Ticket, Swords, Zap, Trophy, Skull, Users, Star, ExternalLink, Clock, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

interface Game {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  howItWorks: string[];
  rewards: string[];
  note: string;
  isRaffle?: boolean;
}

const GAMES: Game[] = [
  {
    id: "king-of-the-hill",
    name: "King of the Hill",
    tagline: "Claim the throne with the biggest multiplier",
    icon: <Crown className="w-7 h-7" />,
    color: "text-gold-400",
    iconBg: "bg-gold-500/15",
    border: "border-gold-500/25",
    badge: "FEATURED",
    badgeColor: "bg-gold-500/15 text-gold-400 border-gold-500/30",
    description: "One of the main community stream games on MattySpins. Viewers are picked live, the chosen viewer selects the slot, and whoever lands the highest multiplier becomes the current KING 👑. Anyone who beats the king takes the throne.",
    howItWorks: [
      "Viewers are picked during stream",
      "The chosen viewer selects the bonus buy / slot",
      "Highest multiplier becomes the current KING 👑",
      "Anyone who beats the current highest multiplier takes the throne",
      "At the end of stream, the KING wins rewards 🏆",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special roles / events"],
    note: "Make sure you're in stream when live for your chance to play 👊",
  },
  {
    id: "bonus-bingo",
    name: "Bonus Bingo",
    tagline: "Complete a line on the bingo board to win",
    icon: <Star className="w-7 h-7" />,
    color: "text-green-400",
    iconBg: "bg-green-500/15",
    border: "border-green-500/25",
    description: "A community stream game where viewers compete to complete the bingo board. A wheel spins to select a square, a viewer is picked, and if their bonus profits the square turns green — first to complete a line wins.",
    howItWorks: [
      "A wheel is spun to select a square on the board",
      "A viewer is then picked during stream",
      "The chosen viewer selects the bonus buy / slot",
      "If the bonus profits, the square turns green 🟩",
      "The viewer claims that square",
      "First completed line wins 🏆 (horizontal, vertical, or diagonal)",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special events / rewards"],
    note: "Make sure you're in stream from the start for your chance to play 👊",
  },
  {
    id: "team-battles",
    name: "Team Battles",
    tagline: "Pick a side and fight for your team",
    icon: <Swords className="w-7 h-7" />,
    color: "text-blue-400",
    iconBg: "bg-blue-500/15",
    border: "border-blue-500/25",
    description: "Viewers split into teams and compete head-to-head. Teams take turns picking slots and bonus buys, and the team with the highest combined multipliers wins the battle.",
    howItWorks: [
      "Viewers are split into competing teams",
      "Each team selects bonus buys / slots during their turns",
      "Teams accumulate multipliers throughout the battle",
      "The team with the highest total wins 🏆",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special events / rewards"],
    note: "Make sure you're in stream from the start for your chance to play 👊",
  },
  {
    id: "bonus-hunt",
    name: "Bonus Hunt",
    tagline: "Request your slot, open it during the reveal",
    icon: <Zap className="w-7 h-7" />,
    color: "text-yellow-400",
    iconBg: "bg-yellow-500/15",
    border: "border-yellow-500/25",
    badge: "EVERY FRIDAY",
    badgeColor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    description: "The weekly community Bonus Hunt on MattySpins. Viewers use !sr to request slots, bonuses are collected throughout the stream, and all saved bonuses are opened later during the reveal. Big multipliers, huge wins and painful dead bonuses — anything can happen 😂",
    howItWorks: [
      "Viewers use !sr to request slots for the hunt",
      "Bonuses are collected throughout the stream",
      "All saved bonuses are opened later during the reveal 🔥",
      "Big multipliers and community rewards throughout",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards / events"],
    note: "Bonus Hunt streams take place every Friday 🏆 — make sure you're in stream from the start to get your slot calls in 👊",
  },
  {
    id: "slot-tournament",
    name: "Slot Tournament",
    tagline: "Battle through the bracket to be crowned champion",
    icon: <Trophy className="w-7 h-7" />,
    color: "text-purple-400",
    iconBg: "bg-purple-500/15",
    border: "border-purple-500/25",
    description: "Compete against other viewers in one of the main interactive stream events. Viewers enter a tournament bracket, choose bonus buys during their rounds, and the highest multipliers advance until one player is crowned Tournament Champion 👑.",
    howItWorks: [
      "Viewers are entered into the tournament bracket",
      "Players choose bonus buys / slots during their rounds",
      "Highest multipliers advance through each stage 👀",
      "Winners progress until one player is crowned Tournament Champion 👑",
      "Every round is do-or-die — one huge hit can change everything 🔥",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special event prizes"],
    note: "Make sure you're in stream from the start to secure your place in the tournament 👊",
  },
  {
    id: "last-man-standing",
    name: "Last Man Standing",
    tagline: "Survive every round or get eliminated",
    icon: <Skull className="w-7 h-7" />,
    color: "text-red-400",
    iconBg: "bg-red-500/15",
    border: "border-red-500/25",
    description: "One of the most intense community stream games on MattySpins. Viewers pick their slots each round, and the lowest multiplier is ELIMINATED. The process continues until only one player remains 👑.",
    howItWorks: [
      "Viewers pick their slots / bonus buys",
      "Each round, the lowest multiplier is ELIMINATED ❌",
      "Surviving players advance to the next round",
      "The process continues until only one player remains 👑",
      "Every round matters — one bad bonus and you could be OUT 👀",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special event prizes"],
    note: "Make sure you're in stream from the start to secure your place in the game 👊",
  },
  {
    id: "wheel-of-fortune",
    name: "Wheel of Fortune",
    tagline: "Let the wheel decide your fate",
    icon: <span className="text-2xl leading-none">🎡</span>,
    color: "text-pink-400",
    iconBg: "bg-pink-500/15",
    border: "border-pink-500/25",
    description: "A chaotic community stream game where the wheel controls the action. Viewers are picked, they spin the Wheel of Fortune, and whatever the wheel lands on — that's what happens next. No two spins are ever the same 😂🔥",
    howItWorks: [
      "Viewers are picked during stream",
      "The chosen viewer spins the Wheel of Fortune 🎡",
      "The wheel decides what happens next",
      "Possible outcomes: slot choices, bonus buy amounts, random challenges, multiplier boosts, punishments, community rewards",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special event prizes"],
    note: "No two Wheel of Fortune streams are ever the same 👊",
  },
  {
    id: "chat-vs-matty",
    name: "Chat vs Matty",
    tagline: "Vote together. Beat Matty. Claim the rewards.",
    icon: <Users className="w-7 h-7" />,
    color: "text-cyan-400",
    iconBg: "bg-cyan-500/15",
    border: "border-cyan-500/25",
    description: "One of the most competitive community stream events. Chat votes on every decision — slots, bonus buys, risks and challenges — and goes head-to-head against Matty. If Chat wins, the community earns rewards 🏆. If Matty wins… chat holds the L 😂",
    howItWorks: [
      "Chat votes on decisions throughout the stream 👀",
      "Viewers decide the slots, bonus buys, risks and challenges",
      "Matty takes on the community to see who comes out on top",
      "Examples: Profit vs Loss, Over/Under predictions, chat-picked bonus buys, risky challenges, punishment rounds",
      "If Chat wins → community earns rewards 🏆",
      "If Matty wins → chat holds the L 😂",
    ],
    rewards: ["Website points", "Giveaway entries", "Community rewards", "Special event prizes"],
    note: "Every stream becomes a battle between Matty and the community 👊",
  },
  {
    id: "royal-rumble",
    name: "Royal Rumble",
    tagline: "Hit 1000x to qualify. Return to fight for the crown.",
    icon: <Crown className="w-7 h-7" />,
    color: "text-orange-400",
    iconBg: "bg-orange-500/15",
    border: "border-orange-500/25",
    badge: "MONTHLY EVENT",
    badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    description: "The biggest monthly community event on MattySpins. Every multiplier over 1000x during the month qualifies a player for the Royal Rumble. Qualified players return for the monthly showdown to battle for the champion title and a BONUS BUY prize 🎁",
    howItWorks: [
      "Every multiplier over 1000x during the month qualifies for the Royal Rumble 👀",
      "Any player who hits a 1000x+ earns a place in the event",
      "Qualified players return for the monthly Royal Rumble showdown",
      "Players take turns choosing bonus buys / slots",
      "Huge hits advance players through the competition",
      "The battle continues until one player is crowned Royal Rumble Champion 👑",
    ],
    rewards: ["BONUS BUY prize 🎁", "Website points", "Giveaway entries", "Community rewards"],
    note: "Only the biggest hitters make it into the Rumble… every 1000x could secure your spot 🔥",
  },
  {
    id: "raffles",
    name: "Raffles",
    tagline: "Spend your coins on tickets for a chance to win prizes",
    icon: <Ticket className="w-7 h-7" />,
    color: "text-gold-400",
    iconBg: "bg-gold-500/15",
    border: "border-gold-500/25",
    isRaffle: true,
    description: "Use the coins you earn from the community to enter raffles for real prizes. More tickets = better odds. Winners are announced in Discord.",
    howItWorks: [
      "Earn coins through stream activity, check-ins, and community games",
      "Spend coins on raffle tickets — each ticket is one entry",
      "When the raffle ends, a winner is drawn at random",
      "Winners are announced in Discord — open a ticket to claim 🏆",
    ],
    rewards: ["Cash prizes", "Community rewards", "Special event prizes"],
    note: "Click to view all active raffles and enter now 👊",
  },
];

function timeLeft(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
}

function RaffleSection() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, { type: "success" | "error"; text: string }>>({});
  const [userCoins, setUserCoins] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myTickets, setMyTickets] = useState<Record<string, number>>({});

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);
    fetch(API_ENDPOINTS.RAFFLES, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => {
        if (d.raffles) {
          setRaffles(d.raffles);
          const init: Record<string, number> = {};
          for (const r of d.raffles) init[r.id] = 1;
          setQuantities(init);
          if (token) loadMyTickets(token, d.raffles);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (token) {
      fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.user) setUserCoins(d.user.points); })
        .catch(() => {});
    }
  }, []);

  const loadMyTickets = async (token: string, list: Raffle[]) => {
    const result: Record<string, number> = {};
    await Promise.all(list.map(async (r) => {
      try {
        const res = await fetch(API_ENDPOINTS.RAFFLE_USER_TICKETS(r.id), { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        if (d.tickets) result[r.id] = d.tickets.length;
      } catch { /* ignore */ }
    }));
    setMyTickets(result);
  };

  const handleBuy = async (raffle: Raffle) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const qty = quantities[raffle.id] ?? 1;
    setBuying(raffle.id);
    try {
      const res = await fetch(API_ENDPOINTS.RAFFLE_PURCHASE(raffle.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: qty }),
      });
      const d = await res.json();
      if (d.success || d.tickets) {
        setUserCoins((c) => c - raffle.ticketPrice * qty);
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map((i) => <div key={i} className="bg-navy-800/40 border border-white/5 rounded-xl h-48 animate-pulse" />)}
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="mt-4 text-center py-10 bg-navy-900/40 border border-white/5 rounded-xl">
        <Ticket className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No active raffles right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {isLoggedIn && (
        <p className="text-gold-400 text-sm font-semibold mb-4">
          Your balance: <span className="font-gaming">{userCoins.toLocaleString()}</span> coins
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {raffles.map((raffle) => {
          const pct = Math.min((raffle.ticketsSold / raffle.maxTickets) * 100, 100);
          const qty = quantities[raffle.id] ?? 1;
          const totalCost = raffle.ticketPrice * qty;
          const canAfford = userCoins >= totalCost;
          const isSoldOut = raffle.ticketsSold >= raffle.maxTickets;
          const myCount = myTickets[raffle.id] ?? 0;
          const msg = msgs[raffle.id];

          return (
            <div key={raffle.id} className={`bg-navy-900/60 border rounded-xl p-5 flex flex-col ${raffle.isFeatured ? "border-gold-500/30" : "border-white/8"}`}>
              {raffle.isFeatured && <span className="text-xs font-bold text-gold-400 tracking-widest uppercase mb-2">⭐ Featured</span>}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="text-white font-semibold leading-snug">{raffle.title}</h4>
                <div className="shrink-0 bg-gold-500/10 border border-gold-500/20 rounded-lg px-2.5 py-1 text-center">
                  <p className="text-gold-400 font-bold text-sm leading-none">{raffle.ticketPrice}</p>
                  <p className="text-gray-600 text-[10px]">coins</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm font-medium mb-1">🏆 {raffle.prize}</p>
              {raffle.description && <p className="text-gray-500 text-xs mb-2">{raffle.description}</p>}
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
                <Clock className="w-3 h-3" />
                <span>{timeLeft(raffle.endsAt)}</span>
                {raffle.numberOfWinners > 1 && <span className="ml-auto text-gold-500/70">{raffle.numberOfWinners} winners</span>}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{raffle.ticketsSold} / {raffle.maxTickets} tickets</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-navy-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {myCount > 0 && <p className="text-[#53FC18] text-xs font-semibold mb-2">You have {myCount} ticket{myCount > 1 ? "s" : ""}</p>}
              {msg && <p className={`text-xs mb-2 ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
              <div className="mt-auto">
                {!isLoggedIn ? (
                  <p className="text-gray-500 text-xs">Login to buy tickets</p>
                ) : isSoldOut ? (
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Sold Out</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={qty}
                      onChange={(e) => setQuantities((q) => ({ ...q, [raffle.id]: Number(e.target.value) }))}
                      className="bg-navy-800/60 border border-white/8 rounded-lg px-2 py-2 text-white text-sm focus:outline-none w-16"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StreamGamesPage() {
  const [openRaffle, setOpenRaffle] = useState(false);
  const raffleRef = useRef<HTMLDivElement>(null);

  const handleRaffleClick = () => {
    const next = !openRaffle;
    setOpenRaffle(next);
    if (next) {
      setTimeout(() => raffleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            Community Events
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            STREAM <span className="text-gold-400">GAMES</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Interactive games and events that run during live streams. Jump in, pick your slots, and compete for rewards.
          </p>
        </motion.div>

        {/* Games grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              ref={game.isRaffle ? raffleRef : undefined}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={game.isRaffle ? handleRaffleClick : undefined}
              className={`bg-navy-800/60 border ${game.border} rounded-2xl p-6 flex flex-col ${game.isRaffle ? "cursor-pointer hover:border-gold-500/50 transition-colors" : ""} ${game.isRaffle && openRaffle ? "md:col-span-2" : ""}`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${game.iconBg} border border-white/6 flex items-center justify-center shrink-0 ${game.color}`}>
                    {game.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-bold text-lg leading-tight">{game.name}</h2>
                      {game.badge && (
                        <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded border ${game.badgeColor}`}>
                          {game.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{game.tagline}</p>
                  </div>
                </div>
                {game.isRaffle && (
                  <div className={`text-gray-400 transition-transform duration-300 ${openRaffle ? "" : "rotate-180"}`}>
                    <ChevronUp className="w-5 h-5" />
                  </div>
                )}
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-4">{game.description}</p>

              {/* How it works */}
              <div className="mb-4">
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-2">How it works</p>
                <ul className="space-y-1.5">
                  {game.howItWorks.map((step, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className={`text-xs font-black mt-0.5 shrink-0 ${game.color}`}>•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rewards */}
              <div className="bg-navy-900/60 border border-white/5 rounded-xl p-4 mb-4">
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-2">🎁 Rewards can include</p>
                <div className="flex flex-wrap gap-2">
                  {game.rewards.map((r, j) => (
                    <span key={j} className="bg-white/5 border border-white/8 text-gray-300 text-xs px-2.5 py-1 rounded-lg">{r}</span>
                  ))}
                </div>
              </div>

              <p className="text-gray-500 text-xs mt-auto pt-1 border-t border-white/5">{game.note}</p>

              {/* Inline raffle section */}
              <AnimatePresence>
                {game.isRaffle && openRaffle && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="pt-4 border-t border-white/8 mt-4">
                      <p className="text-white font-bold text-sm uppercase tracking-widest mb-1">Active Raffles</p>
                      <RaffleSection />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center bg-navy-800/40 border border-white/5 rounded-2xl p-8"
        >
          <h3 className="text-white font-bold text-lg mb-2">Ready to play?</h3>
          <p className="text-gray-500 text-sm mb-5">Follow on Kick so you never miss a live stream.</p>
          <a
            href="https://kick.com/mattyspinsslots"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#53FC18] hover:bg-[#45D615] text-black font-bold px-6 py-3 rounded-xl text-sm transition-all uppercase tracking-widest"
          >
            Follow on Kick
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

      </div>
    </div>
  );
}
