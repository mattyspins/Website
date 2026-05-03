"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/lib/api";

interface UserProfile {
  id: string;
  discordId: string;
  displayName: string;
  avatar?: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  isAdmin: boolean;
  kickUsername?: string;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  createdAt: string;
  lastActiveAt: string;
}

interface UserStats {
  totalViewingTime: number;
  totalPurchases: number;
  totalRaffleTickets: number;
  totalWins: number;
  currentStreak: number;
  longestStreak: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showRainbetModal, setShowRainbetModal] = useState(false);
  const [rainbetUsername, setRainbetUsername] = useState("");
  const [showKickModal, setShowKickModal] = useState(false);
  const [kickUsername, setKickUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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
        setProfile(data.user);

        // Initialize stats with zeros - will be populated as features are used
        setStats({
          totalViewingTime: 0,
          totalPurchases: 0,
          totalRaffleTickets: 0,
          totalWins: 0,
          currentStreak: 0,
          longestStreak: 0,
        });
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const submitRainbetUsername = async () => {
    if (!rainbetUsername.trim()) {
      alert("Please enter your Rainbet username");
      return;
    }

    setSubmitting(true);
    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(API_ENDPOINTS.USERS_RAINBET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ rainbetUsername: rainbetUsername.trim() }),
      });

      if (response.ok) {
        alert("✅ Rainbet username submitted! Waiting for admin verification.");
        setShowRainbetModal(false);
        setRainbetUsername("");
        loadProfile();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Failed to submit Rainbet username");
      }
    } catch (error) {
      console.error("Failed to submit Rainbet username:", error);
      alert("Failed to submit Rainbet username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitKickUsername = async () => {
    if (!kickUsername.trim()) {
      alert("Please enter your Kick username");
      return;
    }

    setSubmitting(true);
    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(API_ENDPOINTS.USERS_KICK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ kickUsername: kickUsername.trim() }),
      });

      if (response.ok) {
        alert("✅ Kick username submitted! Waiting for admin verification.");
        setShowKickModal(false);
        setKickUsername("");
        loadProfile();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Failed to submit Kick username");
      }
    } catch (error) {
      console.error("Failed to submit Kick username:", error);
      alert("Failed to submit Kick username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-6 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">My Profile</h1>
          <button
            onClick={() => router.push("/")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6"
            >
              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden border-4 border-purple-500">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-4xl">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {profile.displayName}
                </h2>
                {profile.isAdmin && (
                  <span className="inline-block bg-yellow-500 text-black text-sm px-3 py-1 rounded-full font-bold mb-2">
                    ADMIN
                  </span>
                )}
                <p className="text-gray-400 text-sm">
                  Member since{" "}
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              {/* Points */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-6">
                <p className="text-white/80 text-sm mb-1">Total Points</p>
                <p className="text-3xl font-bold text-white">
                  💎 {profile.points.toLocaleString()}
                </p>
              </div>

              {/* Account Links */}
              <div className="space-y-3">
                <div className="bg-black/30 rounded-lg p-3">
                  <p className="text-gray-400 text-sm mb-1">Discord</p>
                  <p className="text-white font-semibold">✅ Connected</p>
                </div>

                <div className="bg-black/30 rounded-lg p-3 mt-[10px]">
                  <p className="text-gray-400 text-sm mb-1">Kick</p>
                  {profile.kickUsername ? (
                    <div>
                      <p className="text-green-400 font-semibold">
                        ✅ {profile.kickUsername}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Verified by admin
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowKickModal(true)}
                      className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                    >
                      + Add Username
                    </button>
                  )}
                </div>

                <div className="bg-black/30 rounded-lg p-3 mt-[10px]">
                  <p className="text-gray-400 text-sm mb-1">Rainbet</p>
                  {profile.rainbetVerified ? (
                    <div>
                      <p className="text-green-400 font-semibold">
                        ✅ {profile.rainbetUsername}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Verified by admin
                      </p>
                    </div>
                  ) : profile.rainbetUsername ? (
                    <div>
                      <p className="text-yellow-400 font-semibold">
                        ⏳ {profile.rainbetUsername}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Pending admin verification
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRainbetModal(true)}
                      className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                    >
                      + Add Username
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Statistics</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  icon="⏱️"
                  label="Viewing Time"
                  value={`${stats?.totalViewingTime || 0} min`}
                  color="blue"
                />
                <StatCard
                  icon="🛒"
                  label="Purchases"
                  value={stats?.totalPurchases || 0}
                  color="green"
                />
                <StatCard
                  icon="🎟️"
                  label="Raffle Tickets"
                  value={stats?.totalRaffleTickets || 0}
                  color="yellow"
                />
                <StatCard
                  icon="🏆"
                  label="Wins"
                  value={stats?.totalWins || 0}
                  color="gold"
                />
                <StatCard
                  icon="🔥"
                  label="Current Streak"
                  value={`${stats?.currentStreak || 0} days`}
                  color="orange"
                />
                <StatCard
                  icon="⭐"
                  label="Longest Streak"
                  value={`${stats?.longestStreak || 0} days`}
                  color="purple"
                />
              </div>
            </motion.div>

            {/* Points Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Points Summary
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-4">
                  <p className="text-white/80 text-sm mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-white">
                    +{profile.totalEarned.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-4">
                  <p className="text-white/80 text-sm mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-white">
                    -{profile.totalSpent.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-4">
                  <p className="text-white/80 text-sm mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {profile.points.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Recent Activity
              </h3>

              <div className="text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-400 text-lg">No recent activity</p>
                <p className="text-gray-500 text-sm mt-2">
                  Your activity will appear here once you start participating
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Kick Username Modal */}
        {showKickModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">
                Add Kick Username
              </h3>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <p className="text-yellow-300 text-sm">
                  ⚠️ <strong>Important:</strong> Your Kick username will be
                  verified by an admin. Once verified, it cannot be changed by
                  you and can only be modified by an admin.
                </p>
              </div>

              <p className="text-gray-300 mb-4">
                Enter your Kick username to link your account. This helps us
                track your activity and reward you with points!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Kick Username
                  </label>
                  <input
                    type="text"
                    value={kickUsername}
                    onChange={(e) => setKickUsername(e.target.value)}
                    placeholder="Enter your Kick username"
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={submitKickUsername}
                    disabled={submitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    onClick={() => {
                      setShowKickModal(false);
                      setKickUsername("");
                    }}
                    disabled={submitting}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Rainbet Username Modal */}
        {showRainbetModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">
                Add Rainbet Username
              </h3>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <p className="text-yellow-300 text-sm">
                  ⚠️ <strong>Important:</strong> Your Rainbet username will be
                  verified by an admin. Once verified, it cannot be changed by
                  you and can only be modified by an admin.
                </p>
              </div>

              <p className="text-gray-300 mb-4">
                Enter your Rainbet username to link your account. This helps us
                track your activity and reward you with points!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Rainbet Username
                  </label>
                  <input
                    type="text"
                    value={rainbetUsername}
                    onChange={(e) => setRainbetUsername(e.target.value)}
                    placeholder="Enter your Rainbet username"
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={submitRainbetUsername}
                    disabled={submitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    onClick={() => {
                      setShowRainbetModal(false);
                      setRainbetUsername("");
                    }}
                    disabled={submitting}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colorClasses: any = {
    blue: "from-blue-600 to-blue-800",
    green: "from-green-600 to-green-800",
    yellow: "from-yellow-600 to-yellow-800",
    gold: "from-yellow-500 to-orange-600",
    orange: "from-orange-600 to-red-600",
    purple: "from-purple-600 to-purple-800",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-white/80 text-sm mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function ActivityItem({ icon, text, time, color }: any) {
  const colorClasses: any = {
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    gold: "text-yellow-500",
  };

  return (
    <div className="flex items-center space-x-3 bg-black/30 rounded-lg p-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className={`font-semibold ${colorClasses[color]}`}>{text}</p>
        <p className="text-gray-500 text-sm">{time}</p>
      </div>
    </div>
  );
}
