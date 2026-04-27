"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/lib/api";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  totalTransactions: number;
  recentSignups: number;
  suspendedUsers: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_STATS, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon="👥"
        color="purple"
      />
      <StatCard
        title="Active Users"
        value={stats.activeUsers}
        icon="✅"
        color="green"
      />
      <StatCard
        title="Total Points"
        value={stats.totalPoints.toLocaleString()}
        icon="💎"
        color="blue"
      />
      <StatCard
        title="Transactions"
        value={stats.totalTransactions}
        icon="💳"
        color="yellow"
      />
      <StatCard
        title="Recent Signups"
        value={stats.recentSignups}
        icon="🆕"
        color="pink"
      />
      <StatCard
        title="Suspended Users"
        value={stats.suspendedUsers}
        icon="🚫"
        color="red"
      />
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colorClasses: any = {
    purple: "from-purple-600 to-purple-800",
    green: "from-green-600 to-green-800",
    blue: "from-blue-600 to-blue-800",
    yellow: "from-yellow-600 to-yellow-800",
    pink: "from-pink-600 to-pink-800",
    red: "from-red-600 to-red-800",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border border-white/10`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-4xl">{icon}</span>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-white/80 font-semibold">{title}</p>
    </motion.div>
  );
}
