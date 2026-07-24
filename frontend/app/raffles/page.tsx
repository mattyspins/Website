import type { Metadata } from "next";
import Link from "next/link";
import { Ticket, Gift, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Raffles",
  description: "Two ways to win on MattySpins — spend Matty Coins on ticket raffles, or wager under the code to enter the weekly raffle automatically.",
  alternates: { canonical: "/raffles" },
};

const RAFFLE_HUBS = [
  {
    id: "raffles",
    name: "Ticket Raffles",
    tagline: "Spend Matty Coins on tickets for a chance to win prizes",
    icon: <Ticket className="w-7 h-7" />,
    color: "text-gold-400",
    iconBg: "bg-gold-500/15",
    border: "border-gold-500/20",
    howItWorks: [
      "Earn Matty Coins through stream activity, check-ins, and community games",
      "Spend Matty Coins on raffle tickets — each ticket is one entry",
      "When the raffle ends, a winner is drawn at random",
      "Winners are announced in Discord — open a ticket to claim 🏆",
    ],
    rewards: ["Cash prizes", "Community rewards", "Special event prizes"],
    link: "/raffle",
    linkLabel: "View Active Raffles",
  },
  {
    id: "weekly-raffle",
    name: "Weekly Raffle",
    tagline: "Wager under the code, get entered automatically",
    icon: <Gift className="w-7 h-7" />,
    color: "text-purple-400",
    iconBg: "bg-purple-500/15",
    border: "border-purple-500/20",
    badge: "NEW",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    howItWorks: [
      "Connect and verify your Razed account",
      "Wager at least the week's minimum under the affiliate code",
      "You're automatically entered — no purchase needed",
      "Every Monday, Matty draws the winner live",
    ],
    rewards: ["Cash prizes", "Community rewards"],
    link: "/weekly-raffle",
    linkLabel: "View Weekly Raffle",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            Win Big
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            RAFF<span className="text-gold-400">LES</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Two ways to win — spend Matty Coins on ticket raffles, or just meet the weekly wager requirement to get entered automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {RAFFLE_HUBS.map((hub) => (
            <Link
              key={hub.id}
              href={hub.link}
              className={`group bg-navy-800/60 border ${hub.border} hover:border-opacity-60 hover:bg-navy-700/60 rounded-2xl p-6 flex flex-col transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl ${hub.iconBg} flex items-center justify-center ${hub.color} group-hover:scale-110 transition-transform`}>
                  {hub.icon}
                </div>
                {hub.badge && (
                  <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded border ${hub.badgeColor}`}>
                    {hub.badge}
                  </span>
                )}
              </div>

              <h2 className="text-white font-bold text-lg mb-1">{hub.name}</h2>
              <p className="text-gray-400 text-sm mb-4">{hub.tagline}</p>

              <div className="space-y-1.5 mb-4 flex-1">
                {hub.howItWorks.map((step, i) => (
                  <p key={i} className="text-gray-400 text-xs flex items-start gap-2">
                    <span className="text-gold-500/70 mt-0.5">•</span>
                    <span>{step}</span>
                  </p>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {hub.rewards.map((r) => (
                  <span key={r} className="text-[10px] text-gray-300 bg-navy-900/60 border border-white/5 rounded-full px-2.5 py-1">
                    {r}
                  </span>
                ))}
              </div>

              <span className={`mt-auto inline-flex items-center gap-2 ${hub.color} font-semibold text-sm`}>
                {hub.linkLabel} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
