"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/lib/api";

interface User {
  id: string;
  discordId: string;
  displayName: string;
  kickUsername?: string;
  kickVerified?: boolean;
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<"kick" | "rainbet">("kick");
  const [newUsername, setNewUsername] = useState("");
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      console.error("No access token found");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("Loading all users...");

      const response = await fetch(API_ENDPOINTS.ADMIN_USERS_SEARCH, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Load all users response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("All users response:", data);
        if (data.success && data.data && data.data.users) {
          setUsers(data.data.users);
          console.log("Loaded users:", data.data.users.length);
        } else {
          console.error("Invalid response format:", data);
          setUsers([]);
        }
      } else {
        const errorData = await response.text();
        console.error(
          "Failed to load users:",
          response.status,
          response.statusText,
          errorData,
        );
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      console.error("No access token found");
      return;
    }

    try {
      const url = query
        ? `${API_ENDPOINTS.ADMIN_USERS_SEARCH}?q=${encodeURIComponent(query)}`
        : API_ENDPOINTS.ADMIN_USERS_SEARCH;

      console.log("Searching users with URL:", url);
      console.log("Access token:", accessToken.substring(0, 20) + "...");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("User search response:", data);
        if (data.success && data.data && data.data.users) {
          setUsers(data.data.users);
          console.log("Found users:", data.data.users.length);
        } else {
          console.error("Invalid response format:", data);
          setUsers([]);
        }
      } else {
        const errorData = await response.text();
        console.error(
          "Failed to search users:",
          response.status,
          response.statusText,
          errorData,
        );
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
      setUsers([]);
    }
  };

  const handleEditUsername = async () => {
    if (!selectedUser || !newUsername.trim()) {
      alert("Please provide a username");
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const endpoint =
        editType === "kick"
          ? API_ENDPOINTS.ADMIN_EDIT_KICK_USERNAME(selectedUser.id)
          : API_ENDPOINTS.ADMIN_EDIT_RAINBET_USERNAME(selectedUser.id);

      const fieldName =
        editType === "kick" ? "kickUsername" : "rainbetUsername";

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ [fieldName]: newUsername }),
      });

      if (response.ok) {
        alert(
          `${editType === "kick" ? "Kick" : "Rainbet"} username updated successfully!`,
        );
        setShowEditModal(false);
        setSelectedUser(null);
        setNewUsername("");
        loadAllUsers(); // Refresh the user list
      } else {
        const data = await response.json();
        alert(data.error?.message || `Failed to update ${editType} username`);
      }
    } catch (error) {
      console.error(`Failed to update ${editType} username:`, error);
      alert(`Failed to update ${editType} username`);
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
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              loadAllUsers();
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Show All
          </button>
        </div>
      </form>

      {/* User Count */}
      <div className="mb-4">
        <p className="text-gray-400 text-sm">
          {users.length > 0
            ? `Showing ${users.length} user${users.length !== 1 ? "s" : ""}`
            : "No users found"}
        </p>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">No users found</p>
          <p className="text-gray-500 text-sm mt-2">
            {searchQuery
              ? "Try a different search term"
              : "No users have registered yet"}
          </p>
        </div>
      ) : (
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
                  <td className="py-3 px-4 max-w-0">
                    <div>
                      <p
                        className="text-white font-semibold truncate"
                        title={user.displayName}
                      >
                        {user.displayName}
                      </p>
                      <p
                        className="text-gray-500 text-sm truncate"
                        title={user.discordId}
                      >
                        {user.discordId}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {user.kickVerified ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">
                          {user.kickUsername}
                        </span>
                        <span className="text-xs text-green-500 ml-1">
                          ✓ Verified
                        </span>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditType("kick");
                            setNewUsername(user.kickUsername || "");
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Edit Kick username"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ) : user.kickUsername ? (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">
                          {user.kickUsername}
                        </span>
                        <button
                          onClick={async () => {
                            if (
                              !confirm(
                                `Verify Kick username "${user.kickUsername}" for ${user.displayName}?`,
                              )
                            ) {
                              return;
                            }

                            const accessToken =
                              localStorage.getItem("access_token");
                            if (!accessToken) return;

                            try {
                              const response = await fetch(
                                API_ENDPOINTS.ADMIN_VERIFY_KICK(user.id),
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${accessToken}`,
                                  },
                                  body: JSON.stringify({ verified: true }),
                                },
                              );

                              if (response.ok) {
                                alert("✅ Kick username verified!");
                                loadAllUsers();
                              } else {
                                const data = await response.json();
                                alert(
                                  data.error?.message ||
                                    "Failed to verify Kick username",
                                );
                              }
                            } catch (error) {
                              console.error(
                                "Failed to verify Kick username:",
                                error,
                              );
                              alert("Failed to verify Kick username");
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Verify Kick username"
                        >
                          ✓ Verify
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditType("kick");
                            setNewUsername(user.kickUsername || "");
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Edit Kick username"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Not set</span>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditType("kick");
                            setNewUsername("");
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Set Kick username"
                        >
                          + Set
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {user.rainbetVerified ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">
                          {user.rainbetUsername}
                        </span>
                        <span className="text-xs text-green-500 ml-1">✓</span>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditType("rainbet");
                            setNewUsername(user.rainbetUsername || "");
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Edit Rainbet username"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ) : user.rainbetUsername ? (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">
                          {user.rainbetUsername}
                        </span>
                        <button
                          onClick={async () => {
                            if (
                              !confirm(
                                `Verify Rainbet username "${user.rainbetUsername}" for ${user.displayName}?`,
                              )
                            ) {
                              return;
                            }

                            const accessToken =
                              localStorage.getItem("access_token");
                            if (!accessToken) return;

                            try {
                              const response = await fetch(
                                API_ENDPOINTS.ADMIN_VERIFY_RAINBET(user.id),
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${accessToken}`,
                                  },
                                  body: JSON.stringify({ verified: true }),
                                },
                              );

                              if (response.ok) {
                                alert("✅ Rainbet username verified!");
                                loadAllUsers();
                              } else {
                                const data = await response.json();
                                alert(
                                  data.error?.message ||
                                    "Failed to verify Rainbet username",
                                );
                              }
                            } catch (error) {
                              console.error(
                                "Failed to verify Rainbet username:",
                                error,
                              );
                              alert("Failed to verify Rainbet username");
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Verify Rainbet username"
                        >
                          ✓ Verify
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditType("rainbet");
                            setNewUsername(user.rainbetUsername || "");
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Edit Rainbet username"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Not set</span>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditType("rainbet");
                            setNewUsername("");
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          title="Set Rainbet username"
                        >
                          + Set
                        </button>
                      </div>
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
      )}

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
      {/* Edit Username Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Edit {editType === "kick" ? "Kick" : "Rainbet"} Username
            </h3>
            <p className="text-gray-300 mb-4">
              User:{" "}
              <span className="text-white font-semibold">
                {selectedUser.displayName}
              </span>
              <br />
              Current:{" "}
              <span className="text-purple-400 font-semibold">
                {editType === "kick"
                  ? selectedUser.kickUsername || "Not set"
                  : selectedUser.rainbetUsername || "Not set"}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  New {editType === "kick" ? "Kick" : "Rainbet"} Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={`Enter ${editType === "kick" ? "Kick" : "Rainbet"} username`}
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Leave empty to remove the username
                </p>
              </div>

              {editType === "rainbet" && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Changing the Rainbet username will reset verification
                    status
                  </p>
                </div>
              )}

              {editType === "kick" && selectedUser?.kickVerified && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Changing the Kick username will reset verification status
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleEditUsername}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setNewUsername("");
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
