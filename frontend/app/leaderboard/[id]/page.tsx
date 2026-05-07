"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

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

export default function PublicLeaderboardPage() {
  const params = useParams();
  const leaderboardId = params.id as string;

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardDetails();

    // Set up Socket.IO connection
    const socket = getSocket();

    // Join the leaderboard room
    socket.emit("joinLeaderboard", leaderboardId);

    // Listen for real-time updates
    socket.on(
      "rankingsUpdated",
      (data: { leaderboardId: string; rankings: Ranking[] }) => {
        if (data.leaderboardId === leaderboardId) {
          setRankings(data.rankings);
        }
      },
    );

    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchLeaderboardDetails, 30000);

    return () => {
      clearInterval(interval);
      socket.emit("leaveLeaderboard", leaderboardId);
      socket.off("rankingsUpdated");
    };
  }, [leaderboardId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (leaderboard) {
        const remaining = new Date(leaderboard.endDate).getTime() - Date.now();
        setTimeRemaining(Math.max(0, remaining));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [leaderboard]);

  const fetchLeaderboardDetails = async () => {
    try {
      const response = await api.get(
        `/api/manual-leaderboards/${leaderboardId}`,
      );
      console.log("Public leaderboard response:", response);
      if (response.success) {
        setLeaderboard(response.data.leaderboard);
        setRankings(response.data.rankings);
        setUserRank(response.data.userRank);
        setTimeRemaining(response.data.timeRemaining);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Ended";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
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

  const isEnded = leaderboard.status === "ended" || timeRemaining <= 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <a
            href="/"
            className="text-purple-400 hover:text-purple-300 mb-4 inline-block"
          >
            ← Back to Home
          </a>

          <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-8 mb-6">
            <h1 className="text-5xl font-bold mb-4">{leaderboard.title}</h1>
            {leaderboard.description && (
              <p className="text-xl text-gray-300 mb-6">
                {leaderboard.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black bg-opacity-30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Prize Pool</div>
                <div className="text-3xl font-bold text-green-400">
                  {leaderboard.prizePool}
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Time Remaining</div>
                <div
                  className={`text-3xl font-bold ${isEnded ? "text-red-400" : "text-yellow-400"}`}
                >
                  {formatTimeRemaining(timeRemaining)}
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Participants</div>
                <div className="text-3xl font-bold text-blue-400">
                  {rankings.length}
                </div>
              </div>
            </div>

            {userRank && (
              <div className="mt-6 bg-purple-800 bg-opacity-50 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">Your Rank</div>
                <div className="text-2xl font-bold">#{userRank}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-3xl font-bold mb-6">🏆 Rankings</h2>

          {rankings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-xl">No participants yet</p>
              <p className="text-gray-500 mt-2">
                Be the first to join the competition!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankings.map((ranking) => {
                const isCurrentUser = userRank === ranking.rank;
                const isTopThree = ranking.rank <= 3;

                return (
                  <div
                    key={ranking.userId}
                    className={`rounded-lg p-4 transition ${
                      isCurrentUser
                        ? "bg-purple-900 border-2 border-purple-500"
                        : isTopThree
                          ? "bg-gradient-to-r from-yellow-900 to-orange-900"
                          : "bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`text-3xl font-bold ${
                            ranking.rank === 1
                              ? "text-yellow-400"
                              : ranking.rank === 2
                                ? "text-gray-300"
                                : ranking.rank === 3
                                  ? "text-orange-400"
                                  : "text-gray-400"
                          }`}
                        >
                          {ranking.rank === 1
                            ? "🥇"
                            : ranking.rank === 2
                              ? "🥈"
                              : ranking.rank === 3
                                ? "🥉"
                                : `#${ranking.rank}`}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg truncate">
                            {ranking.username}
                          </div>
                          {ranking.kickUsername && (
                            <div className="text-sm text-gray-400 truncate">
                              Kick: {ranking.kickUsername}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-400">
                          ${ranking.totalWagers.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {ranking.wagerCount} wager
                          {ranking.wagerCount !== 1 ? "s" : ""}
                        </div>
                        {ranking.prize && (
                          <div className="mt-2">
                            <div className="text-lg font-semibold text-green-400">
                              {ranking.prize}
                            </div>
                            {ranking.prizeDescription && (
                              <div className="text-xs text-gray-400">
                                {ranking.prizeDescription}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">ℹ️ About This Leaderboard</h3>
          <p className="text-gray-400">
            This is a manual leaderboard where wagers are tracked and entered by
            administrators based on actual gambling activity. Rankings are
            updated in real-time as new wagers are added. The leaderboard is
            separate from the channel points system.
          </p>
        </div>
      </div>
    </div>
  );
}
