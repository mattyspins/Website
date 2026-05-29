"use client";

import { motion } from "framer-motion";
import { Crown, Ticket, Swords, Zap, Trophy, Skull, Wheel, Users, Star, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Game {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  howItWorks: string[];
  rewards: string[];
  note: string;
  href?: string;
}

const GAMES: Game[] = [
  {
    id: "king-of-the-hill",
    name: "King of the Hill",
    tagline: "Claim the throne with the biggest multiplier",
    icon: <Crown className="w-7 h-7" />,
    color: "text-gold-400",
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
    icon: <span className="text-2xl">🎡</span>,
    color: "text-pink-400",
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
    border: "border-gold-500/25",
    href: "/raffle",
    description: "Use the coins you earn from the community to enter raffles for real prizes. More tickets = better odds. Winners are announced in Discord.",
    howItWorks: [
      "Earn coins through stream activity, check-ins, and community games",
      "Spend coins on raffle tickets — each ticket is one entry",
      "When the raffle ends, a winner is drawn at random",
      "Winners are announced in Discord — open a ticket to claim 🏆",
    ],
    rewards: ["Cash prizes", "Community rewards", "Special event prizes"],
    note: "Check the Raffles page to see all active draws and enter now 👊",
  },
];

export default function StreamGamesPage() {
  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-navy-800/60 border ${game.border} rounded-2xl p-6 flex flex-col`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-navy-900/60 border border-white/6 flex items-center justify-center shrink-0 ${game.color}`}>
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
                {game.href && (
                  <Link
                    href={game.href}
                    className="shrink-0 flex items-center gap-1 text-gold-400 hover:text-gold-300 text-xs font-semibold transition-colors"
                  >
                    Enter
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Description */}
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
                    <span key={j} className="bg-white/5 border border-white/8 text-gray-300 text-xs px-2.5 py-1 rounded-lg">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Note */}
              <p className="text-gray-500 text-xs mt-auto pt-1 border-t border-white/5">{game.note}</p>
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
