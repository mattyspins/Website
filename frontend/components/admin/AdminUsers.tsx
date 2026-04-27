"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/lib/api";

interface User {
  id: string;
  discordId: string;
  displayName: string;
  kickUsername?: string;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  isSuspended: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");

  useEffect(() => {
    searchUsers("");
  }, []);

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

  const adjustPoints = async () => {
    if (!selectedUser || !pointsReason) {
      alert("Please provide a reason");
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch(
        API_ENDPOINTS.ADMIN_USER_POINTS(selectedUser.id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ amount: pointsAmount, reason: pointsReason }),
        },
      );

      if (response.ok) {
        alert("Points adjusted successfully!");
        setShowModal(false);
        setSelectedUser(null);
        setPointsAmount(0);
        setPointsReason("");
        searchUsers(searchQuery);
      } else {
        const data = await response.json();
        alert(data.error?.message || "Failed to adjust points");
      }
    } catch (error) {
      console.error("Failed to adjust points:", error);
      alert("Failed to adjust points");
    }
  };

  return (
    <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>

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
                Rainbet
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
                    <p className="text-gray-500 text-sm">{user.discordId}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {user.kickUsername ? (
                    <span className="text-green-400">{user.kickUsername}</span>
                  ) : (
                    <span className="text-gray-500">Not verified</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {user.rainbetVerified ? (
                    <div>
                      <span className="text-green-400">
                        {user.rainbetUsername}
                      </span>
                      <span className="text-xs text-green-500 ml-1">✓</span>
                    </div>
                  ) : user.rainbetUsername ? (
                    <div>
                      <span className="text-yellow-400">
                        {user.rainbetUsername}
                      </span>
                      <span className="text-xs text-yellow-500 ml-1">⏳</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">Not set</span>
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
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded transition-colors"
                    >
                      💎 Points
                    </button>
                    {!user.isAdmin && (
                      <button
                        onClick={async () => {
                          const action = user.isModerator
                            ? "demote"
                            : "promote";
                          if (
                            !confirm(
                              `Are you sure you want to ${action} this user ${user.isModerator ? "from" : "to"} moderator?`,
                            )
                          ) {
                            return;
                          }

                          const accessToken =
                            localStorage.getItem("access_token");
                          if (!accessToken) return;

                          try {
                            const response = await fetch(
                              API_ENDPOINTS.ADMIN_USER_MODERATOR(user.id),
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${accessToken}`,
                                },
                                body: JSON.stringify({
                                  isModerator: !user.isModerator,
                                }),
                              },
                            );

                            if (response.ok) {
                              alert(
                                `User ${action}d successfully! They will need to log in again for changes to take effect.`,
                              );
                              searchUsers(searchQuery);
                            } else {
                              const data = await response.json();
                              alert(
                                data.error?.message ||
                                  `Failed to ${action} user`,
                              );
                            }
                          } catch (error) {
                            console.error(`Failed to ${action} user:`, error);
                            alert(`Failed to ${action} user`);
                          }
                        }}
                        className={`text-sm px-3 py-1 rounded transition-colors ${
                          user.isModerator
                            ? "bg-gray-600 hover:bg-gray-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {user.isModerator ? "🔻 Demote" : "⭐ Promote"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Points Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Adjust Points
            </h3>
            <p className="text-gray-300 mb-4">
              User:{" "}
              <span className="text-white font-semibold">
                {selectedUser.displayName}
              </span>
              <br />
              Current:{" "}
              <span className="text-purple-400 font-semibold">
                {selectedUser.points.toLocaleString()}
              </span>{" "}
              points
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Amount (negative to subtract)
                </label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) =>
                    setPointsAmount(parseInt(e.target.value) || 0)
                  }
                  placeholder="e.g., 1000 or -500"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Reason
                </label>
                <input
                  type="text"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  placeholder="e.g., Bonus reward, Refund, etc."
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-gray-300 text-sm">
                  New balance:{" "}
                  <span className="text-purple-400 font-semibold">
                    {(selectedUser.points + pointsAmount).toLocaleString()}
                  </span>{" "}
                  points
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={adjustPoints}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                    setPointsAmount(0);
                    setPointsReason("");
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
  );
}
