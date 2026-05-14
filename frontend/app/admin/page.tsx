"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { LoadingError } from "@/components/ui/ErrorState";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminSchedule from "@/components/admin/AdminSchedule";
import AdminRaffles from "@/components/admin/AdminRaffles";
import AdminStore from "@/components/admin/AdminStore";
import AdminStats from "@/components/admin/AdminStats";
import { API_ENDPOINTS } from "@/lib/api";

type TabType =
  | "overview"
  | "users"
  | "leaderboards"
  | "guessthebalance"
  | "schedule"
  | "raffles"
  | "store";

export default function AdminDashboard() {
  // Admin Dashboard with Guess the Balance feature - May 2026
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { error } = useToast();

  const breadcrumbItems = [{ label: "Admin Dashboard" }];

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push("/");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.user?.isAdmin) {
          error(
            "Access Denied",
            "Admin privileges required to access this page.",
          );
          router.push("/");
        } else {
          setLoading(false);
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Admin check failed:", error);
      setLoadingError("Failed to verify admin access. Please try again.");
      setLoading(false);
    }
  };

  const retryAuth = () => {
    setLoadingError(null);
    setLoading(true);
    checkAdminAccess();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
          <div className="mb-8">
            <div className="h-8 bg-gray-700 rounded-lg animate-pulse mb-2 w-64"></div>
            <div className="h-4 bg-gray-800 rounded animate-pulse w-48"></div>
          </div>
          <TableSkeleton rows={6} columns={5} />
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="min-h-screen p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
          <LoadingError onRetry={retryAuth} resource="admin dashboard" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "users", label: "👥 Users", icon: "👥" },
    { id: "leaderboards", label: "🏆 Leaderboards", icon: "🏆" },
    { id: "guessthebalance", label: "🎯 Guess the Balance", icon: "🎯" },
    { id: "store", label: "🛒 Store", icon: "🛒" },
    { id: "schedule", label: "📅 Schedule", icon: "📅" },
    // Raffles will be available after Kick OAuth implementation
    // { id: "raffles", label: "🎟️ Raffles", icon: "🎟️" },
  ];

  return (
    <div className="min-h-screen p-3 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-400">Manage your streaming platform</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/admin/guess-the-balance")}
              className="bg-navy-700 hover:bg-navy-600 border border-white/8 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              Guess the Balance
            </button>
            <button
              onClick={() => router.push("/admin/store")}
              className="bg-navy-700 hover:bg-navy-600 border border-white/8 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              Manage Store
            </button>
            <button
              onClick={() => router.push("/admin/leaderboards")}
              className="bg-navy-700 hover:bg-navy-600 border border-white/8 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              Manage Leaderboards
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-white/5 hover:bg-white/8 border border-white/6 text-gray-400 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-navy-800/60 backdrop-blur-lg border border-white/6 rounded-xl p-2 mb-6">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gold-500 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label.replace(/^.+ /, "")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "overview" && <AdminStats />}
          {activeTab === "users" && <AdminUsers />}
          {activeTab === "leaderboards" && (
            <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Leaderboard Management
                </h2>
                <button
                  onClick={() => (window.location.href = "/admin/leaderboards")}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
                >
                  ➕ Create New Leaderboard
                </button>
              </div>
              <p className="text-gray-300 mb-4">
                Click the button above to create a new leaderboard or{" "}
                <a
                  href="/admin/leaderboards"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  view all leaderboards
                </a>
                .
              </p>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">
                  Quick Guide:
                </h3>
                <ul className="text-gray-300 space-y-2">
                  <li>
                    • <strong>Create Leaderboard:</strong> Set title,
                    description, dates, and prize pool
                  </li>
                  <li>
                    • <strong>Add Wagers:</strong> Manually add user wagers to
                    track rankings
                  </li>
                  <li>
                    • <strong>Real-time Updates:</strong> Rankings update
                    automatically as wagers are added
                  </li>
                  <li>
                    • <strong>Export CSV:</strong> Download leaderboard data for
                    record keeping
                  </li>
                </ul>
              </div>
            </div>
          )}
          {activeTab === "guessthebalance" && (
            <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  🎯 Guess the Balance Management
                </h2>
                <button
                  onClick={() =>
                    (window.location.href = "/admin/guess-the-balance")
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
                >
                  ➕ Manage Games
                </button>
              </div>
              <p className="text-gray-300 mb-4">
                Create and manage Guess the Balance games for your bonus hunts.{" "}
                <a
                  href="/admin/guess-the-balance"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Go to full management page
                </a>
                .
              </p>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">
                  Quick Guide:
                </h3>
                <ul className="text-gray-300 space-y-2">
                  <li>
                    • <strong>Create Game:</strong> Set starting balance, number
                    of bonuses, and break-even multiplier
                  </li>
                  <li>
                    • <strong>Open Guessing:</strong> Allow viewers to submit
                    their guesses
                  </li>
                  <li>
                    • <strong>Close Guessing:</strong> Stop accepting new
                    guesses before revealing results
                  </li>
                  <li>
                    • <strong>Complete Game:</strong> Enter final balance and
                    automatically determine the winner
                  </li>
                  <li>
                    • <strong>Award Coins:</strong> Winner receives coins
                    automatically
                  </li>
                </ul>
              </div>
            </div>
          )}
          {activeTab === "store" && <AdminStore />}
          {activeTab === "schedule" && <AdminSchedule />}
        </div>
      </div>
    </div>
  );
}
