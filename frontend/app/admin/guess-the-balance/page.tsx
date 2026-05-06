"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Target, Plus, ArrowLeft } from "lucide-react";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";
import { GuessTheBalanceStatus } from "@/types/guessTheBalance";
import { API_ENDPOINTS } from "@/lib/api";
import CreateGameModal from "@/components/admin/CreateGameModal";
import GameManagementCard from "@/components/admin/GameManagementCard";

export default function AdminGuessTheBalancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GuessTheBalanceGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<GuessTheBalanceGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    GuessTheBalanceStatus | "ALL"
  >("ALL");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (statusFilter === "ALL") {
      setFilteredGames(games);
    } else {
      setFilteredGames(games.filter((game) => game.status === statusFilter));
    }
  }, [statusFilter, games]);

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
          alert("Access denied. Admin privileges required.");
          router.push("/");
        } else {
          loadGames();
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Admin check failed:", error);
      router.push("/");
    }
  };

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const allGames = await guessTheBalanceApi.getAllGames();
      // Sort by created date, newest first
      allGames.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setGames(allGames);
    } catch (err) {
      console.error("Failed to load games:", err);
      setError("Failed to load games. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleGameCreated = () => {
    setShowCreateModal(false);
    loadGames();
  };

  const handleGameUpdated = () => {
    loadGames();
  };

  const handleGameDeleted = () => {
    loadGames();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const statusCounts = {
    ALL: games.length,
    DRAFT: games.filter((g) => g.status === GuessTheBalanceStatus.DRAFT).length,
    OPEN: games.filter((g) => g.status === GuessTheBalanceStatus.OPEN).length,
    CLOSED: games.filter((g) => g.status === GuessTheBalanceStatus.CLOSED)
      .length,
    COMPLETED: games.filter((g) => g.status === GuessTheBalanceStatus.COMPLETED)
      .length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin")}
                className="mr-4 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center">
                <Target className="w-12 h-12 text-green-400 mr-4" />
                <div>
                  <h1 className="text-4xl font-bold text-white">
                    Guess the Balance
                  </h1>
                  <p className="text-gray-400">Manage bonus hunt games</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg transition-all font-semibold transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Game</span>
            </button>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`bg-black/50 backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all ${
              statusFilter === "ALL"
                ? "border-purple-500 ring-2 ring-purple-500/50"
                : "border-purple-500/30 hover:border-purple-500/50"
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">Total Games</p>
            <p className="text-3xl font-bold text-white">{statusCounts.ALL}</p>
          </div>
          <div
            onClick={() => setStatusFilter(GuessTheBalanceStatus.DRAFT)}
            className={`bg-black/50 backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all ${
              statusFilter === GuessTheBalanceStatus.DRAFT
                ? "border-gray-500 ring-2 ring-gray-500/50"
                : "border-gray-500/30 hover:border-gray-500/50"
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">Draft</p>
            <p className="text-3xl font-bold text-gray-300">
              {statusCounts.DRAFT}
            </p>
          </div>
          <div
            onClick={() => setStatusFilter(GuessTheBalanceStatus.OPEN)}
            className={`bg-black/50 backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all ${
              statusFilter === GuessTheBalanceStatus.OPEN
                ? "border-green-500 ring-2 ring-green-500/50"
                : "border-green-500/30 hover:border-green-500/50"
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">Open</p>
            <p className="text-3xl font-bold text-green-400">
              {statusCounts.OPEN}
            </p>
          </div>
          <div
            onClick={() => setStatusFilter(GuessTheBalanceStatus.CLOSED)}
            className={`bg-black/50 backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all ${
              statusFilter === GuessTheBalanceStatus.CLOSED
                ? "border-yellow-500 ring-2 ring-yellow-500/50"
                : "border-yellow-500/30 hover:border-yellow-500/50"
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">Closed</p>
            <p className="text-3xl font-bold text-yellow-400">
              {statusCounts.CLOSED}
            </p>
          </div>
          <div
            onClick={() => setStatusFilter(GuessTheBalanceStatus.COMPLETED)}
            className={`bg-black/50 backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all ${
              statusFilter === GuessTheBalanceStatus.COMPLETED
                ? "border-blue-500 ring-2 ring-blue-500/50"
                : "border-blue-500/30 hover:border-blue-500/50"
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">Completed</p>
            <p className="text-3xl font-bold text-blue-400">
              {statusCounts.COMPLETED}
            </p>
          </div>
        </motion.div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-12 text-center"
          >
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {statusFilter === "ALL"
                ? "No Games Yet"
                : `No ${statusFilter} Games`}
            </h2>
            <p className="text-gray-400 text-lg mb-6">
              {statusFilter === "ALL"
                ? "Create your first Guess the Balance game to get started!"
                : `There are no games with status ${statusFilter}.`}
            </p>
            {statusFilter === "ALL" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg transition-all font-semibold transform hover:scale-105"
              >
                Create Your First Game
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGames.map((game, index) => (
              <GameManagementCard
                key={game.id}
                game={game}
                index={index}
                onGameUpdated={handleGameUpdated}
                onGameDeleted={handleGameDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <CreateGameModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleGameCreated}
        />
      )}
    </div>
  );
}
