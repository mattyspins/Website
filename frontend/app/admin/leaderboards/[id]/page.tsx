"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface User {
  id: string;
  displayName: string;
  kickUsername?: string;
  points: number;
}

interface Ranking {
  rank: number;
  userId: string;
  username: string;
  kickUsername?: string;
  totalWagers: number;
  wagerCount: number;
  prize?: string;
  prizeDescription?: string;
}

interface Leaderboard {
  id: string;
  title: string;
  description?: string;
  prizePool: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function ManageLeaderboardPage() {
  const params = useParams();
  const leaderboardId = params.id as string;

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wagerAmount, setWagerAmount] = useState("");
  const [wagerNotes, setWagerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaderboardDetails();
  }, [leaderboardId]);

  const fetchLeaderboardDetails = async () => {
    try {
      const response = await api.get(
        `/api/manual-leaderboards/${leaderboardId}`,
      );
      console.log("Leaderboard details response:", response);
      if (response.success) {
        setLeaderboard(response.data.leaderboard);
        setRankings(response.data.rankings);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(
        `/api/admin/users/search?q=${encodeURIComponent(query)}`,
      );
      console.log("User search response:", response);
      if (response.success && response.data && response.data.users) {
        setSearchResults(response.data.users);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchUsers(value);
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.displayName);
    setSearchResults([]);
  };

  const handleAddWager = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert("Please select a user");
      return;
    }

    const amount = parseFloat(wagerAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid wager amount");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(
        `/api/manual-leaderboards/admin/${leaderboardId}/wagers`,
        {
          userId: selectedUser.id,
          amount,
          notes: wagerNotes,
        },
      );

      console.log("Add wager response:", response);

      if (response.success) {
        alert(
          `Wager added successfully! User total: ${response.userTotal.toFixed(2)}`,
        );
        setWagerAmount("");
        setWagerNotes("");
        setSelectedUser(null);
        setSearchQuery("");
        fetchLeaderboardDetails();
      } else {
        alert(`Error: ${response.error || "Failed to add wager"}`);
      }
    } catch (error: any) {
      console.error("Add wager error:", error);
      alert(
        `Error: ${error.response?.data?.error || error.message || "Failed to add wager"}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const exportLeaderboard = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/manual-leaderboards/admin/${leaderboardId}/export?format=csv`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export leaderboard");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `leaderboard-${leaderboardId}-${Date.now()}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to export leaderboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 pt-32">
        <div className="max-w-7xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 pt-32">
        <div className="max-w-7xl mx-auto">
          <p>Leaderboard not found</p>
        </div>
      </div>
    );
  }

  const timeRemaining = new Date(leaderboard.endDate).getTime() - Date.now();
  const isActive = leaderboard.status === "active" && timeRemaining > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <a
            href="/admin/leaderboards"
            className="text-purple-400 hover:text-purple-300 mb-4 inline-block"
          >
            ← Back to Leaderboards
          </a>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">{leaderboard.title}</h1>
              {leaderboard.description && (
                <p className="text-gray-400 mb-4">{leaderboard.description}</p>
              )}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Prize Pool:</span>{" "}
                  <span className="font-semibold text-purple-400">
                    {leaderboard.prizePool}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>{" "}
                  <span className="font-semibold">
                    {leaderboard.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Participants:</span>{" "}
                  <span className="font-semibold">{rankings.length}</span>
                </div>
              </div>
            </div>
            <button
              onClick={exportLeaderboard}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition"
            >
              Export CSV
            </button>
          </div>
        </div>

        {isActive && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Add Wager</h2>
            <form onSubmit={handleAddWager} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search User *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="Search by Discord or Kick username..."
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => selectUser(user)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-600 transition"
                        >
                          <div className="font-semibold">
                            {user.displayName}
                          </div>
                          {user.kickUsername && (
                            <div className="text-sm text-gray-400">
                              Kick: {user.kickUsername}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUser && (
                  <div className="mt-2 text-sm text-green-400">
                    Selected: {selectedUser.displayName}
                    {selectedUser.kickUsername &&
                      ` (Kick: ${selectedUser.kickUsername})`}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Wager Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., 150.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={wagerNotes}
                    onChange={(e) => setWagerNotes(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedUser}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition"
              >
                {submitting ? "Adding..." : "Add Wager"}
              </button>
            </form>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Rankings</h2>
          {rankings.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No wagers yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Username</th>
                    <th className="text-left py-3 px-4">Kick Username</th>
                    <th className="text-right py-3 px-4">Total Wagers</th>
                    <th className="text-right py-3 px-4">Wager Count</th>
                    <th className="text-right py-3 px-4">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ranking) => (
                    <tr
                      key={ranking.userId}
                      className="border-b border-gray-700 hover:bg-gray-750"
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-lg">
                          #{ranking.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold max-w-0">
                        <div className="truncate">{ranking.username}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 max-w-0">
                        <div className="truncate">
                          {ranking.kickUsername || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-400">
                        ${ranking.totalWagers.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400">
                        {ranking.wagerCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ranking.prize ? (
                          <div>
                            <div className="font-semibold text-green-400">
                              {ranking.prize}
                            </div>
                            {ranking.prizeDescription && (
                              <div className="text-xs text-gray-400">
                                {ranking.prizeDescription}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
