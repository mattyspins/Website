"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminStore from "@/components/admin/AdminStore";
import AdminStats from "@/components/admin/AdminStats";
import AdminMilestones from "@/components/admin/AdminMilestones";
import AdminSchedule from "@/components/admin/AdminSchedule";
import AdminMilestoneClaims from "@/components/admin/AdminMilestoneClaims";
import AdminRaffles from "@/components/admin/AdminRaffles";
import { API_ENDPOINTS } from "@/lib/api";
import { WifiOff } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Target,
  ShoppingBag,
  Calendar,
  Medal,
  ExternalLink,
  Shield,
  ClipboardList,
  Ticket,
  FileText,
  Zap,
  Grid3X3,
} from "lucide-react";

type TabId =
  | "overview"
  | "users"
  | "claims"
  | "raffles"
  | "store"
  | "schedule"
  | "milestones"
  | "bonus-hunt"
  | "bonus-bingo";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",    icon: LayoutDashboard },
  { id: "users",     label: "Users",       icon: Users },
  { id: "claims",    label: "Claims",      icon: ClipboardList },
  { id: "raffles",   label: "Raffles",     icon: Ticket },
  { id: "store",     label: "Store",       icon: ShoppingBag },
  { id: "milestones",label: "Milestones",  icon: Medal },
  { id: "schedule",  label: "Schedule",    icon: Calendar },
  { id: "bonus-hunt",label: "Bonus Hunt",  icon: Zap },
  { id: "bonus-bingo",label: "Bonus Bingo", icon: Grid3X3 },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [kickChatConnected, setKickChatConnected] = useState<boolean | null>(null);
  const kickPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { error } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_ME, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (!data.user?.isAdmin) {
          error("Access Denied", "Admin privileges required.");
          router.push("/");
        } else {
          setLoading(false);
          startKickChatPolling();
        }
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  };

  const pollKickChat = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_KICK_CHAT_STATUS, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setKickChatConnected(!!d.connected);
      }
    } catch { /* ignore */ }
  };

  const startKickChatPolling = () => {
    pollKickChat();
    kickPollRef.current = setInterval(pollKickChat, 30_000);
  };

  useEffect(() => {
    return () => { if (kickPollRef.current) clearInterval(kickPollRef.current); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Kick chat disconnect banner */}
      {kickChatConnected === false && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Kick Chat Disconnected</span>
              <span className="text-amber-500 text-xs hidden sm:inline">— chat commands and point awards are paused. Reconnecting automatically.</span>
            </div>
            <button
              onClick={pollKickChat}
              className="text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors shrink-0"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Top header bar */}
      <div className="bg-navy-900/95 border-b border-gold-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            <Shield className="w-3.5 h-3.5" />
            Secure Command Center
          </div>
          <h1 className="text-3xl md:text-4xl font-gaming font-bold text-white tracking-widest">
            ADMIN <span className="text-gold-400">DASHBOARD</span>
          </h1>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-0">
          <div className="flex overflow-x-auto scrollbar-hide gap-1 pb-0 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              if (tab.id === "raffles" || tab.id === "bonus-hunt" || tab.id === "bonus-bingo") {
                const href = tab.id === "raffles" ? "/admin/raffle" : tab.id === "bonus-hunt" ? "/hunt-tracker" : "/admin/bonus-bingo";
                return (
                  <a
                    key={tab.id}
                    href={href}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all rounded-t-lg border-b-2 whitespace-nowrap shrink-0 text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/3"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                  </a>
                );
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all rounded-t-lg border-b-2 whitespace-nowrap shrink-0 ${
                    active
                      ? "text-gold-400 border-gold-400 bg-gold-500/8"
                      : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/3"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {activeTab === "overview" && (
          <div className="space-y-8">
            <AdminStats />
            {/* Quick Access */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                Quick Access
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    href: "/admin/leaderboards",
                    icon: <Trophy className="w-5 h-5 text-gold-400" />,
                    bg: "bg-gold-500/10",
                    title: "Leaderboards",
                    desc: "Create leaderboards, add wager entries, export CSV",
                  },
                  {
                    href: "/admin/guess-the-balance",
                    icon: <Target className="w-5 h-5 text-pink-400" />,
                    bg: "bg-pink-500/10",
                    title: "Guess the Balance",
                    desc: "Create games, open/close guessing, award winners",
                  },
                  {
                    href: "/admin/tournament",
                    icon: <Trophy className="w-5 h-5 text-yellow-400" />,
                    bg: "bg-yellow-500/10",
                    title: "Tournament",
                    desc: "Create tournaments, draw participants, manage bracket & declare winners",
                  },
                  {
                    href: "/admin/raffle",
                    icon: <Ticket className="w-5 h-5 text-purple-400" />,
                    bg: "bg-purple-500/10",
                    title: "Raffles",
                    desc: "Create raffles, manage tickets, draw winners",
                  },
                  {
                    href: "/hunt-tracker",
                    icon: <Zap className="w-5 h-5 text-gold-400" />,
                    bg: "bg-gold-500/10",
                    title: "Bonus Hunt",
                    desc: "Create hunts, add slots, go live for viewers to watch the reveal",
                  },
                  {
                    href: "/admin/bonus-bingo",
                    icon: <Grid3X3 className="w-5 h-5 text-green-400" />,
                    bg: "bg-green-500/10",
                    title: "Bonus Bingo",
                    desc: "Create bingo games, spin cells, draw players, mark results",
                  },
                  {
                    href: "/admin/viewer-picker",
                    icon: <Users className="w-5 h-5 text-cyan-400" />,
                    bg: "bg-cyan-500/10",
                    title: "Viewer Picker",
                    desc: "Set a keyword, viewers type it in Kick chat to enter, spin to draw a winner",
                  },
                  {
                    href: "/admin/audit-logs",
                    icon: <FileText className="w-5 h-5 text-blue-400" />,
                    bg: "bg-blue-500/10",
                    title: "Audit Logs",
                    desc: "Full history of all admin actions with before/after values",
                  },
                ].map(({ href, icon, bg, title, desc }) => (
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
          </div>
        )}

        {activeTab === "users" && <AdminUsers />}

        {activeTab === "milestones" && <AdminMilestones />}

        {activeTab === "claims" && <AdminMilestoneClaims />}

        {activeTab === "raffles" && <AdminRaffles />}

        {activeTab === "store" && <AdminStore />}

        {activeTab === "schedule" && <AdminSchedule />}

      </div>
    </div>
  );
}
