"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Trophy, DollarSign } from "lucide-react";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";

interface CompleteGameModalProps {
  game: GuessTheBalanceGame;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompleteGameModal({
  game,
  onClose,
  onSuccess,
}: CompleteGameModalProps) {
  const [finalBalance, setFinalBalance] = useState("");
  const [winnerReward, setWinnerReward] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const balance = parseFloat(finalBalance);
    const reward = winnerReward ? parseInt(winnerReward) : undefined;

    if (isNaN(balance) || balance < 0) {
      setError("Please enter a valid final balance");
      return;
    }

    if (reward !== undefined && (isNaN(reward) || reward < 0)) {
      setError("Please enter a valid reward amount");
      return;
    }

    try {
      setLoading(true);
      await guessTheBalanceApi.completeGame(game.id, {
        finalBalance: balance,
        winnerReward: reward,
      });
      onSuccess();
    } catch (err: any) {
      console.error("Failed to complete game:", err);
      setError(err?.message || "Failed to complete game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl p-4 sm:p-6 w-full max-w-lg mt-2 sm:mt-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div className="flex items-center mb-2 sm:mb-0">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 mr-2 sm:mr-3" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Draw Winner
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors self-end sm:self-auto"
              disabled={loading}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Game Info */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">
              {game.title || `Game #${game.id.slice(0, 8)}`}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Starting Balance
                </p>
                <p className="text-white font-semibold text-sm sm:text-base">
                  ${game.startingBalance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Total Guesses
                </p>
                <p className="text-white font-semibold text-sm sm:text-base">
                  {game.totalGuesses || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Final Balance */}
            <div>
              <label
                htmlFor="finalBalance"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Final Balance <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="finalBalance"
                  value={finalBalance}
                  onChange={(e) => setFinalBalance(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Enter final balance"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The balance after opening all bonuses
              </p>
            </div>

            {/* Winner Reward */}
            <div>
              <label
                htmlFor="winnerReward"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Winner Reward <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="number"
                id="winnerReward"
                value={winnerReward}
                onChange={(e) => setWinnerReward(e.target.value)}
                min="0"
                placeholder="Points to award winner"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Points to award to the winner (leave empty for no reward)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-500/50 rounded-lg p-4"
              >
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Info Box */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                <strong>Note:</strong> The system will automatically calculate
                the winner based on the closest guess to the final balance. In
                case of a tie, the first submission wins.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Drawing...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 mr-2" />
                    Draw Winner
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
