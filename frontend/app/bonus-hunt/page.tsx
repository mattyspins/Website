"use client";

import { motion } from "framer-motion";
import { Target, Trophy, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { GameCardSkeleton } from "@/components/ui/Skeleton";
import { LoadingError } from "@/components/ui/ErrorState";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";
import GuessTheBalanceCard from "@/components/GuessTheBalanceCard";
import CompletedGameCard from "@/components/CompletedGameCard";

export default function BonusHuntPage() {
  const router = useRouter();
  const [activeGames, setActiveGames] = useState<GuessTheBalanceGame[]>([]);
  const [completedGames, setCompletedGames] = useState<GuessTheBalanceGame[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const breadcrumbItems = [{ label: "Bonus Hunt", icon: Target }];

  useEffect(() => {
    checkAuth();
    loadGames();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
  };

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);

      const [active, completed] = await Promise.all([
        guessTheBalanceApi.getActiveGames(),
        guessTheBalanceApi.getCompletedGames(),
      ]);

      setActiveGames(active);
      setCompletedGames(completed.slice(0, 5));
    } catch (err) {
      console.error("Failed to load games:", err);
      setError("Failed to load games. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuessSubmitted = () => {
    loadGames();
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />

          {/* Header Skeleton */}
          <div className="text-center mb-12">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-lg animate-pulse mb-2 sm:mb-0 sm:mr-4" />
              <div className="h-8 sm:h-10 bg-gray-700 rounded-lg animate-pulse w-64" />
            </div>
            <div className="h-4 bg-gray-800 rounded animate-pulse w-96 mx-auto" />
          </div>

          {/* Games Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="h-6 bg-gray-700 rounded animate-pulse w-32 mb-4" />
              <div className="space-y-6">
                {Array.from({ length: 2 }).map((_, index) => (
                  <GameCardSkeleton key={index} />
                ))}
              </div>
            </div>
            <div>
              <div className="h-6 bg-gray-700 rounded animate-pulse w-40 mb-4" />
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <GameCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-3 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4">
            <Target className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mb-2 sm:mb-0 sm:mr-4" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center sm:text-left">
              Guess the Balance
            </h1>
          </div>
          <p className="text-gray-300 text-base sm:text-lg">
            Predict the final balance of bonus hunts and win coins!
          </p>
        </motion.div>

        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-blue-300">
              Please{" "}
              <button
                onClick={() => router.push("/")}
                className="underline font-semibold hover:text-blue-200"
              >
                login with Discord
              </button>{" "}
              to submit your guesses and participate!
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center mb-4 sm:mb-6">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mr-2 sm:mr-3" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Active Games
            </h2>
          </div>

          {activeGames.length === 0 ? (
            <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8 sm:p-12 text-center">
              <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">ðŸŽ¯</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                No Active Games
              </h3>
              <p className="text-gray-400 text-base sm:text-lg">
                There are currently no active games. Check back soon for new
                bonus hunts!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              {activeGames.map((game, index) => (
                <GuessTheBalanceCard
                  key={game.id}
                  game={game}
                  index={index}
                  onGuessSubmitted={handleGuessSubmitted}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </motion.div>

        {completedGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center mb-4 sm:mb-6">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 mr-2 sm:mr-3" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Recent Winners
              </h2>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              {completedGames.map((game, index) => (
                <CompletedGameCard key={game.id} game={game} index={index} />
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-500/10 to-green-500/10 border border-purple-500/30 rounded-2xl p-4 sm:p-6"
        >
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3">
            How to Play Guess the Balance
          </h3>
          <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
            <li className="flex items-start">
              <span className="text-green-400 mr-2 flex-shrink-0">â€¢</span>
              <span>
                <strong>Login Required:</strong> You must be logged in with
                Discord to submit guesses
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2 flex-shrink-0">â€¢</span>
              <span>
                When a bonus hunt starts, the admin will open guessing for the
                game
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2 flex-shrink-0">â€¢</span>
              <span>
                Submit your guess for what the final balance will be after all
                bonuses are opened
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2 flex-shrink-0">â€¢</span>
              <span>
                You can update your guess anytime before guessing closes
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2 flex-shrink-0">â€¢</span>
              <span>
                The player with the closest guess to the final balance wins
                points!
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2 flex-shrink-0">â€¢</span>
              <span>
                In case of a tie, the player who submitted their guess first
                wins
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

