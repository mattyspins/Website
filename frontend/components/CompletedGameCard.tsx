"use client";

import { motion } from "framer-motion";
import { Trophy, Target, DollarSign, TrendingUp, Award } from "lucide-react";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";

interface CompletedGameCardProps {
  game: GuessTheBalanceGame;
  index: number;
}

export default function CompletedGameCard({
  game,
  index,
}: CompletedGameCardProps) {
  const isPerfectGuess = game.winner && game.winner.difference === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-black/50 backdrop-blur-lg border border-yellow-500/30 rounded-2xl p-4 sm:p-6 hover:border-yellow-400/50 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            {game.title || `Bonus Hunt #${game.id.slice(0, 8)}`}
          </h3>
          {game.description && (
            <p className="text-gray-400 text-sm mb-2">{game.description}</p>
          )}
        </div>
        <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0 ml-2" />
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="bg-green-500/10 rounded-lg p-2">
          <div className="flex items-center mb-1">
            <DollarSign className="w-3 h-3 text-green-400 mr-1" />
            <p className="text-gray-400 text-xs">Start</p>
          </div>
          <p className="text-green-400 font-bold text-xs sm:text-sm">
            ${game.startingBalance.toLocaleString()}
          </p>
        </div>

        <div className="bg-blue-500/10 rounded-lg p-2">
          <div className="flex items-center mb-1">
            <DollarSign className="w-3 h-3 text-blue-400 mr-1" />
            <p className="text-gray-400 text-xs">Final</p>
          </div>
          <p className="text-blue-400 font-bold text-xs sm:text-sm">
            ${game.finalBalance?.toLocaleString() || "N/A"}
          </p>
        </div>

        <div className="bg-purple-500/10 rounded-lg p-2">
          <div className="flex items-center mb-1">
            <Target className="w-3 h-3 text-purple-400 mr-1" />
            <p className="text-gray-400 text-xs">Bonuses</p>
          </div>
          <p className="text-purple-400 font-bold text-xs sm:text-sm">
            {game.numberOfBonuses}
          </p>
        </div>
      </div>

      {/* Winner Section */}
      {game.winner ? (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="relative">
                <img
                  src={game.winner.avatar || "/default-avatar.png"}
                  alt={game.winner.displayName}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400"
                />
                {isPerfectGuess && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
                  </div>
                )}
              </div>
              <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                <p
                  className="text-white font-bold text-sm sm:text-base truncate"
                  title={game.winner.displayName}
                >
                  {game.winner.displayName}
                </p>
                <p className="text-yellow-400 text-xs sm:text-sm font-semibold">
                  🏆 Winner
                </p>
              </div>
            </div>
            {isPerfectGuess && (
              <div className="bg-yellow-400 text-black px-2 sm:px-3 py-1 rounded-full text-xs font-bold">
                PERFECT!
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-gray-400 text-xs mb-1">Guess</p>
              <p className="text-white font-bold text-xs sm:text-sm">
                ${game.winner.guessAmount.toLocaleString()}
              </p>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <p className="text-gray-400 text-xs mb-1">Difference</p>
              <p className="text-yellow-400 font-bold text-xs sm:text-sm">
                {isPerfectGuess
                  ? "Perfect! 🎯"
                  : `$${game.winner.difference.toLocaleString()}`}
              </p>
            </div>
          </div>

          {game.winner.reward > 0 && (
            <div className="mt-3 bg-green-500/20 border border-green-500/50 rounded-lg p-2 text-center">
              <p className="text-green-300 text-sm font-semibold">
                Reward: {game.winner.reward.toLocaleString()} coins
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 text-center">
          <p className="text-gray-400">No winner determined</p>
        </div>
      )}

      {/* Completion Date */}
      {game.completedAt && (
        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Completed: {new Date(game.completedAt).toLocaleString()}
          </p>
        </div>
      )}
    </motion.div>
  );
}
