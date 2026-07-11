"use client";

import AdminStats from "@/components/admin/AdminStats";
import UserGrowthChart from "@/components/admin/charts/UserGrowthChart";
import ActiveUsersChart from "@/components/admin/charts/ActiveUsersChart";
import ActivityFeed from "@/components/admin/ActivityFeed";
import {
  Trophy,
  Target,
  Ticket,
  Zap,
  Grid3X3,
  Users,
  Dices,
  FileText,
  Monitor,
  ExternalLink,
  Gift,
  Swords,
} from "lucide-react";

const QUICK_ACCESS = [
  { href: "/admin/leaderboards", icon: <Trophy className="w-5 h-5 text-gold-400" />, bg: "bg-gold-500/10", title: "Leaderboards", desc: "Create leaderboards, add wager entries, export CSV" },
  { href: "/admin/guess-the-balance", icon: <Target className="w-5 h-5 text-pink-400" />, bg: "bg-pink-500/10", title: "Guess the Balance", desc: "Create games, open/close guessing, award winners" },
  { href: "/admin/tournament", icon: <Trophy className="w-5 h-5 text-yellow-400" />, bg: "bg-yellow-500/10", title: "Tournament", desc: "Create tournaments, draw participants, manage bracket & declare winners" },
  { href: "/admin/raffle", icon: <Ticket className="w-5 h-5 text-purple-400" />, bg: "bg-purple-500/10", title: "Raffles", desc: "Create raffles, manage tickets, draw winners" },
  { href: "/admin/weekly-raffle", icon: <Gift className="w-5 h-5 text-violet-400" />, bg: "bg-violet-500/10", title: "Weekly Raffle", desc: "Configure eligibility, preview entrants, draw the weekly winner" },
  { href: "/hunt-tracker", icon: <Zap className="w-5 h-5 text-gold-400" />, bg: "bg-gold-500/10", title: "Bonus Hunt", desc: "Create hunts, add slots, go live for viewers to watch the reveal" },
  { href: "/admin/bonus-bingo", icon: <Grid3X3 className="w-5 h-5 text-green-400" />, bg: "bg-green-500/10", title: "Bonus Bingo", desc: "Create bingo games, spin cells, draw players, mark results" },
  { href: "/admin/viewer-picker", icon: <Users className="w-5 h-5 text-cyan-400" />, bg: "bg-cyan-500/10", title: "Viewer Picker", desc: "Set a keyword, viewers type it in Kick chat to enter, spin to draw a winner" },
  { href: "/admin/king-of-the-hill", icon: <Trophy className="w-5 h-5 text-amber-400" />, bg: "bg-amber-500/10", title: "King of the Hill", desc: "Viewers join with !king, draw a challenger, record their slot result, crown the king" },
  { href: "/admin/high-roller", icon: <Dices className="w-5 h-5 text-red-400" />, bg: "bg-red-500/10", title: "High Roller", desc: "Viewers predict Over/Under a multiplier line each round and build a correct-guess streak" },
  { href: "/admin/boss-raid", icon: <Swords className="w-5 h-5 text-orange-400" />, bg: "bg-orange-500/10", title: "Boss Raid", desc: "Viewers join with a keyword, take turns picking slots, and deal damage to a shared boss" },
  { href: "/admin/audit-log", icon: <FileText className="w-5 h-5 text-blue-400" />, bg: "bg-blue-500/10", title: "Audit Log", desc: "Full history of all admin actions with before/after values" },
];

const OBS_WIDGETS = [
  { href: "/picker-widget", label: "Viewer Picker", desc: "Winner reveal overlay" },
  { href: "/bonus-hunt-widget", label: "Bonus Hunt", desc: "Live hunt stats overlay" },
  { href: "/bingo-widget", label: "Bonus Bingo", desc: "Bingo grid overlay" },
  { href: "/tournament-widget", label: "Tournament", desc: "Bracket display overlay" },
  { href: "/high-roller-widget", label: "High Roller", desc: "Round/streak overlay" },
  { href: "/boss-raid-widget", label: "Boss Raid", desc: "Boss arena + leaderboard overlay" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white tracking-wide">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview of platform health and activity</p>
      </div>

      <AdminStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UserGrowthChart />
        <ActiveUsersChart />
      </div>

      <ActivityFeed />

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_ACCESS.map(({ href, icon, bg, title, desc }) => (
            <a
              key={href}
              href={href}
              className="group bg-navy-800/60 border border-white/6 hover:border-white/12 rounded-xl p-5 flex items-start gap-4 transition-all hover:bg-navy-800/90"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                </div>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          OBS Widget Links
        </h2>
        <p className="text-gray-600 text-xs mb-3">Copy these URLs into OBS as Browser Sources.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OBS_WIDGETS.map(({ href, label, desc }) => (
            <div key={href} className="bg-navy-800/60 border border-white/6 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}${href}`)}
                  className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs font-mono truncate block w-full text-left transition-colors"
                  title="Click to copy URL"
                >
                  {href}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
