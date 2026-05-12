"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/ToastProvider";
import { API_ENDPOINTS } from "@/lib/api";

interface User {
  id: string;
  discordId: string;
  displayName: string;
  kickUsername?: string;
  rainbetUsername?: string;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  isSuspended: boolean;
}

export default function ModeratorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const { success, error, warning } = useToast();
  const [suspendDuration, setSuspendDuration] = useState<number>(7);

  useEffect(() => {
    checkModeratorAccess();
    searchUsers("");
  }, []);

  const checkModeratorAccess = async () => {
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
        if (!data.user?.isModerator && !data.user?.isAdmin) {
          error(
            "Access Denied",
            "Moderator privileges required to access this page.",
          );
          router.push("/");
        } else {
          setLoading(false);
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Moderator check failed:", error);
      router.push("/");
    }
  };

  const searchUsers = async (query: string) => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const url = query
        ? `${API_ENDPOINTS.ADMIN_USERS_SEARCH}?q=${encodeURIComponent(query)}`
        : API_ENDPOINTS.ADMIN_USERS_SEARCH;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users || []);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    }
  };

  const suspendUser = async () => {
    if (!selectedUser || !suspendReason) {
      warning("Missing Information", "Please provide a reason for suspension");
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch(
        API_ENDPOINTS.ADMIN_USER_SUSPEND(selectedUser.id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            reason: suspendReason,
            durationDays: suspendDuration,
          }),
        },
      );

      if (response.ok) {
        success("User Suspended", "User suspended successfully!");
        setShowSuspendModal(false);
        setSelectedUser(null);
        setSuspendReason("");
        searchUsers(searchQuery);
      } else {
        const data = await response.json();
        error(
          "Suspension Failed",
          data.error?.message || "Failed to suspend user",
        );
      }
    } catch (err) {
      console.error("Failed to suspend user:", err);
      error("Suspension Error", "Failed to suspend user");
    }
  };

  const unsuspendUser = async (userId: string) => {
    if (!confirm("Are you sure you want to unsuspend this user?")) {
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_USER_UNSUSPEND(userId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        success("User Unsuspended", "User unsuspended successfully!");
        searchUsers(searchQuery);
      } else {
        const data = await response.json();
        error(
          "Unsuspension Failed",
          data.error?.message || "Failed to unsuspend user",
        );
      }
    } catch (err) {
      console.error("Failed to unsuspend user:", err);
      error("Unsuspension Error", "Failed to unsuspend user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Moderator Dashboard
            </h1>
            <p className="text-gray-400">
              Manage users and enforce community rules
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* User Management */}
        <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            User Management
          </h2>

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchUsers(searchQuery);
            }}
            className="mb-6"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or Discord ID..."
                className="flex-1 px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">
                    User
                  </th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">
                    Kick
                  </th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">
                    Points
                  </th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">
                    Status
                  </th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-purple-500/10 hover:bg-purple-500/5"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-semibold">
                          {user.displayName}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {user.discordId}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {user.kickUsername ? (
                        <span className="text-green-400">
                          {user.kickUsername}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-purple-400 font-semibold">
                        {user.points.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {user.isAdmin && (
                          <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                            ADMIN
                          </span>
                        )}
                        {user.isModerator && !user.isAdmin && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            MOD
                          </span>
                        )}
                        {user.isSuspended && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            SUSPENDED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {!user.isSuspended ? (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowSuspendModal(true);
                            }}
                            disabled={user.isAdmin}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-3 py-1 rounded transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => unsuspendUser(user.id)}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
                          >
                            Unsuspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suspend Modal */}
        {showSuspendModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-red-900/90 to-black border border-red-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">
                Suspend User
              </h3>
              <p className="text-gray-300 mb-4">
                User:{" "}
                <span className="text-white font-semibold">
                  {selectedUser.displayName}
                </span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Reason for suspension
                  </label>
                  <textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="e.g., Spam, Harassment, Rule violation..."
                    rows={3}
                    className="w-full px-4 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={suspendDuration}
                    onChange={(e) =>
                      setSuspendDuration(parseInt(e.target.value) || 7)
                    }
                    placeholder="7"
                    className="w-full px-4 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Leave empty for permanent suspension
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={suspendUser}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
                  >
                    Suspend User
                  </button>
                  <button
                    onClick={() => {
                      setShowSuspendModal(false);
                      setSelectedUser(null);
                      setSuspendReason("");
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
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

