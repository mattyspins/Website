"use client";

import { motion } from "framer-motion";
import { Target, Trophy, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Target className="w-16 h-16 text-green-400 mr-4" />
            <h1 className="text-5xl font-bold text-white">Guess the Balance</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Predict the final balance of bonus hunts and win points!
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
          <div className="flex items-center mb-6">
            <TrendingUp className="w-8 h-8 text-green-400 mr-3" />
            <h2 className="text-3xl font-bold text-white">Active Games</h2>
          </div>

          {activeGames.length === 0 ? (
            <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-6">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                No Active Games
              </h3>
              <p className="text-gray-400 text-lg">
                There are currently no active games. Check back soon for new
                bonus hunts!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="flex items-center mb-6">
              <Trophy className="w-8 h-8 text-yellow-400 mr-3" />
              <h2 className="text-3xl font-bold text-white">Recent Winners</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          className="bg-gradient-to-r from-purple-500/10 to-green-500/10 border border-purple-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-3">
            How to Play Guess the Balance
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              <span>
                <strong>Login Required:</strong> You must be logged in with
                Discord to submit guesses
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              <span>
                When a bonus hunt starts, the admin will open guessing for the
                game
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              <span>
                Submit your guess for what the final balance will be after all
                bonuses are opened
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              <span>
                You can update your guess anytime before guessing closes
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              <span>
                The player with the closest guess to the final balance wins
                points!
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
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
