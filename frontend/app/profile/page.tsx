"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  ShoppingBag,
  TrendingUp,
  Award,
  Calendar,
  Coins,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { LoadingError } from "@/components/ui/ErrorState";
import { API_ENDPOINTS } from "@/lib/api";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";

interface UserStats {
  totalPoints: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  averageAccuracy: number;
  bestGuess: {
    gameTitle: string;
    accuracy: number;
    pointsWon: number;
  } | null;
  recentGames: Array<{
    id: string;
    title: string;
    userGuess: number;
    actualBalance: number;
    accuracy: number;
    won: boolean;
    pointsWon: number;
    completedAt: string;
  }>;
  purchaseHistory: Array<{
    id: string;
    itemName: string;
    pointsSpent: number;
    purchasedAt: string;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  const breadcrumbItems = [{ label: "My Profile" }];

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push("/?login=required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user info
      const userResponse = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to load user data");
      }

      const userData = await userResponse.json();
      setUser(userData.user);

      // Load user statistics
      await loadUserStats(userData.user.id);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      // Get all completed games to calculate stats
      const completedGames = await guessTheBalanceApi.getCompletedGames();

      // Filter games where user participated
      const userGames = completedGames.filter((game: any) =>
        game.guesses?.some((g: any) => g.userId === userId),
      );

      const gamesPlayed = userGames.length;
      const gamesWon = userGames.filter(
        (game: any) => game.winner?.id === userId,
      ).length;

      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

      // Calculate average accuracy
      const accuracies = userGames.map((game: any) => {
        const userGuess = game.guesses?.find((g: any) => g.userId === userId);
        if (!userGuess || !game.actualBalance) return 0;
        const difference = Math.abs(
          game.actualBalance - userGuess.guessedBalance,
        );
        const accuracy = Math.max(
          0,
          100 - (difference / game.actualBalance) * 100,
        );
        return accuracy;
      });

      const averageAccuracy =
        accuracies.length > 0
          ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
          : 0;

      // Find best guess
      let bestGuess = null;
      if (accuracies.length > 0) {
        const bestAccuracy = Math.max(...accuracies);
        const bestGameIndex = accuracies.indexOf(bestAccuracy);
        const bestGame = userGames[bestGameIndex];
        bestGuess = {
          gameTitle: bestGame.title || "Bonus Hunt",
          accuracy: bestAccuracy,
          pointsWon:
            bestGame.winner?.id === userId ? bestGame.winnerReward || 0 : 0,
        };
      }

      // Recent games
      const recentGames = userGames.slice(0, 5).map((game: any) => {
        const userGuess = game.guesses?.find((g: any) => g.userId === userId);
        const difference = Math.abs(
          game.actualBalance - userGuess.guessedBalance,
        );
        const accuracy = Math.max(
          0,
          100 - (difference / game.actualBalance) * 100,
        );

        return {
          id: game.id,
          title: game.title,
          userGuess: userGuess.guessedBalance,
          actualBalance: game.actualBalance,
          accuracy,
          won: game.winner?.id === userId,
          pointsWon: game.winner?.id === userId ? game.winnerReward || 0 : 0,
          completedAt: game.completedAt,
        };
      });

      setStats({
        totalPoints: user?.points || 0,
        gamesPlayed,
        gamesWon,
        winRate,
        averageAccuracy,
        bestGuess,
        recentGames,
        purchaseHistory: [], // Will be populated from purchase history API
      });
    } catch (err) {
      console.error("Failed to load user stats:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
          <LoadingError onRetry={checkAuthAndLoadData} resource="profile" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-3 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden mr-4">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-3xl">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                {user?.displayName}
              </h1>
              <p className="text-gray-300 flex items-center">
                <Coins className="w-5 h-5 mr-2 text-yellow-400" />
                <span className="text-yellow-300 font-bold text-xl">
                  {user?.points?.toLocaleString()} points
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <Coins className="w-8 h-8 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-semibold">
                TOTAL
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats?.totalPoints.toLocaleString()}
            </p>
            <p className="text-gray-400 text-sm">Points Earned</p>
          </motion.div>

          {/* Games Played */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-blue-400" />
              <span className="text-blue-400 text-sm font-semibold">
                PLAYED
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats?.gamesPlayed}
            </p>
            <p className="text-gray-400 text-sm">Games Participated</p>
          </motion.div>

          {/* Games Won */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-green-400" />
              <span className="text-green-400 text-sm font-semibold">WON</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.gamesWon}</p>
            <p className="text-gray-400 text-sm">
              {stats?.winRate.toFixed(1)}% Win Rate
            </p>
          </motion.div>

          {/* Average Accuracy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <span className="text-purple-400 text-sm font-semibold">
                ACCURACY
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats?.averageAccuracy.toFixed(1)}%
            </p>
            <p className="text-gray-400 text-sm">Average Accuracy</p>
          </motion.div>
        </div>

        {/* Best Guess */}
        {stats?.bestGuess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border border-yellow-500/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center mb-4">
              <Award className="w-8 h-8 text-yellow-400 mr-3" />
              <h2 className="text-2xl font-bold text-white">Best Guess</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Game</p>
                <p className="text-white font-semibold">
                  {stats.bestGuess.gameTitle}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Accuracy</p>
                <p className="text-green-400 font-bold text-xl">
                  {stats.bestGuess.accuracy.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Points Won</p>
                <p className="text-yellow-400 font-bold text-xl">
                  {stats.bestGuess.pointsWon.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Games */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Target className="w-6 h-6 text-green-400 mr-3" />
              <h2 className="text-2xl font-bold text-white">Recent Games</h2>
            </div>
            <a
              href="/bonus-hunt"
              className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
            >
              View All Games →
            </a>
          </div>

          {stats?.recentGames && stats.recentGames.length > 0 ? (
            <div className="space-y-4">
              {stats.recentGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">
                        {game.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {new Date(game.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-gray-400 text-xs">Your Guess</p>
                        <p className="text-white font-semibold">
                          ${game.userGuess.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Actual</p>
                        <p className="text-white font-semibold">
                          ${game.actualBalance.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Accuracy</p>
                        <p
                          className={`font-semibold ${game.accuracy > 90 ? "text-green-400" : game.accuracy > 70 ? "text-yellow-400" : "text-orange-400"}`}
                        >
                          {game.accuracy.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Result</p>
                        {game.won ? (
                          <p className="text-green-400 font-bold flex items-center justify-center">
                            <Trophy className="w-4 h-4 mr-1" />+{game.pointsWon}
                          </p>
                        ) : (
                          <p className="text-gray-500">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No games played yet</p>
              <a
                href="/bonus-hunt"
                className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
              >
                Start playing now →
              </a>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <a
            href="/bonus-hunt"
            className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/30 rounded-xl p-6 hover:border-green-400/50 transition-all hover:scale-105 text-center"
          >
            <Target className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Play Games</h3>
            <p className="text-gray-300 text-sm">
              Join active Guess the Balance games
            </p>
          </a>

          <a
            href="/store"
            className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all hover:scale-105 text-center"
          >
            <ShoppingBag className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Visit Store</h3>
            <p className="text-gray-300 text-sm">
              Spend your points on rewards
            </p>
          </a>

          <a
            href="/leaderboard"
            className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-400/50 transition-all hover:scale-105 text-center"
          >
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Leaderboards</h3>
            <p className="text-gray-300 text-sm">Compete in tournaments</p>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
