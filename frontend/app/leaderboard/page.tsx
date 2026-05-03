"use client";

import { motion } from "framer-motion";
import { Trophy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

interface Leaderboard {
  id: string;
  title: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  totalPrizePool: number;
  participantCount: number;
}

export default function LeaderboardsPage() {
  const router = useRouter();
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LEADERBOARDS_ACTIVE);

      if (response.ok) {
        const data = await response.json();
        console.log("Leaderboards API response:", data);
        // The response structure is { success: true, leaderboards: [...] }
        setLeaderboards(data.leaderboards || []);
      }
    } catch (error) {
      console.error("Failed to load leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-6 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-16 h-16 text-yellow-400 mr-4" />
            <h1 className="text-5xl font-bold text-white">Leaderboards</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Compete in active leaderboards and climb to the top!
          </p>
        </motion.div>

        {/* Leaderboards List */}
        {leaderboards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-12 text-center"
          >
            <div className="text-6xl mb-6">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              No Active Leaderboards
            </h2>
            <p className="text-gray-400 text-lg mb-6">
              There are currently no active leaderboards. Check back soon for
              new competitions!
            </p>
            <p className="text-gray-500 text-sm">
              Leaderboards are created and managed by the admin. Follow our
              social media for announcements about upcoming competitions.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leaderboards.map((leaderboard, index) => (
              <motion.div
                key={leaderboard.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6 cursor-pointer hover:border-purple-400/50 transition-all"
                onClick={() => router.push(`/leaderboard/${leaderboard.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {leaderboard.title}
                    </h3>
                    {leaderboard.description && (
                      <p className="text-gray-400 text-sm mb-3">
                        {leaderboard.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      leaderboard.status === "active"
                        ? "bg-green-500 text-white"
                        : leaderboard.status === "upcoming"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-500 text-white"
                    }`}
                  >
                    {leaderboard.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Prize Pool</p>
                    <p className="text-purple-400 font-bold text-lg">
                      ${(leaderboard.totalPrizePool || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Participants</p>
                    <p className="text-blue-400 font-bold text-lg">
                      {leaderboard.participantCount || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-500">
                      Starts:{" "}
                      {new Date(leaderboard.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-gray-500">
                      Ends: {new Date(leaderboard.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold">
                    <span>View</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-3">
            How Leaderboards Work
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <span className="text-purple-400 mr-2">•</span>
              <span>
                Leaderboards are created by the admin for specific time periods
                and competitions
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-2">•</span>
              <span>
                Compete by placing wagers during the active leaderboard period
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-2">•</span>
              <span>
                Rankings are updated in real-time based on your total wagers
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-2">•</span>
              <span>
                Top performers win prizes from the prize pool at the end of the
                competition
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
