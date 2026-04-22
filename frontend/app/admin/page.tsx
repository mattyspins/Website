"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminSchedule from "@/components/admin/AdminSchedule";
import AdminRaffles from "@/components/admin/AdminRaffles";
import AdminStore from "@/components/admin/AdminStore";
import AdminStats from "@/components/admin/AdminStats";

type TabType = "overview" | "users" | "schedule" | "raffles" | "store";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

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
      const response = await fetch("http://localhost:3001/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.user?.isAdmin) {
          alert("Access denied. Admin privileges required.");
          router.push("/");
        } else {
          setLoading(false);
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Admin check failed:", error);
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "users", label: "👥 Users", icon: "👥" },
    { id: "schedule", label: "📅 Schedule", icon: "📅" },
    { id: "raffles", label: "🎟️ Raffles", icon: "🎟️" },
    { id: "store", label: "🛒 Store", icon: "🛒" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-400">Manage your streaming platform</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-purple-600/20"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-semibold">
                  {tab.label.replace(/^.+ /, "")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "overview" && <AdminStats />}
          {activeTab === "users" && <AdminUsers />}
          {activeTab === "schedule" && <AdminSchedule />}
          {activeTab === "raffles" && <AdminRaffles />}
          {activeTab === "store" && <AdminStore />}
        </div>
      </div>
    </div>
  );
}
