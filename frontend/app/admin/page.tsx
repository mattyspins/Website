"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminStore from "@/components/admin/AdminStore";
import AdminStats from "@/components/admin/AdminStats";
import AdminMilestones from "@/components/admin/AdminMilestones";
import { API_ENDPOINTS } from "@/lib/api";
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
} from "lucide-react";

type TabId =
  | "overview"
  | "users"
  | "leaderboards"
  | "guessthebalance"
  | "store"
  | "schedule"
  | "milestones";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview",        label: "Overview",          icon: LayoutDashboard },
  { id: "users",           label: "Users",             icon: Users },
  { id: "leaderboards",    label: "Leaderboards",      icon: Trophy },
  { id: "guessthebalance", label: "Guess the Balance", icon: Target },
  { id: "store",           label: "Store Items",       icon: ShoppingBag },
  { id: "milestones",      label: "Milestones",        icon: Medal },
  { id: "schedule",        label: "Schedule",          icon: Calendar },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { error } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) { router.push("/"); return; }

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.user?.isAdmin) {
          error("Access Denied", "Admin privileges required.");
          router.push("/");
        } else {
          setLoading(false);
        }
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  };

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
          <div className="flex flex-wrap gap-1.5 pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all rounded-t-lg border-b-2 ${
                    active
                      ? "text-gold-400 border-gold-400 bg-gold-500/8"
                      : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/3"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {activeTab === "overview" && <AdminStats />}

        {activeTab === "users" && <AdminUsers />}

        {activeTab === "milestones" && <AdminMilestones />}

        {activeTab === "store" && <AdminStore />}

        {activeTab === "leaderboards" && (
          <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white">Leaderboard Management</h2>
              <a
                href="/admin/leaderboards"
                className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white px-5 py-2 rounded-lg transition-colors font-semibold text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open Full Manager
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div className="bg-navy-900/40 border border-white/5 rounded-lg p-4">
                <p className="text-white font-semibold mb-1">Create Leaderboard</p>
                <p>Set title, description, dates, and prize pool</p>
              </div>
              <div className="bg-navy-900/40 border border-white/5 rounded-lg p-4">
                <p className="text-white font-semibold mb-1">Add Wagers</p>
                <p>Manually record user wagers to track rankings</p>
              </div>
              <div className="bg-navy-900/40 border border-white/5 rounded-lg p-4">
                <p className="text-white font-semibold mb-1">Real-time Rankings</p>
                <p>Rankings update automatically as wagers are added</p>
              </div>
              <div className="bg-navy-900/40 border border-white/5 rounded-lg p-4">
                <p className="text-white font-semibold mb-1">Export CSV</p>
                <p>Download leaderboard data for record keeping</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "guessthebalance" && (
          <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white">Guess the Balance</h2>
              <a
                href="/admin/guess-the-balance"
                className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-white px-5 py-2 rounded-lg transition-colors font-semibold text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Manage Games
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              {[
                ["Create Game", "Set starting balance, number of bonuses, and break-even multiplier"],
                ["Open Guessing", "Allow viewers to submit their guesses"],
                ["Close Guessing", "Stop accepting new guesses before revealing results"],
                ["Complete & Award Coins", "Enter final balance, winner receives coins automatically"],
              ].map(([title, desc]) => (
                <div key={title} className="bg-navy-900/40 border border-white/5 rounded-lg p-4">
                  <p className="text-white font-semibold mb-1">{title}</p>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Stream Schedule</h2>
            <p className="text-gray-400 text-sm">
              Stream schedule management coming soon. Configure upcoming stream times and events.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
