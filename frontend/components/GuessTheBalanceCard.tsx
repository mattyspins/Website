"use client";

import { motion } from "framer-motion";
import { Target, Users, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";
import GuessSubmissionForm from "./GuessSubmissionForm";

interface GuessTheBalanceCardProps {
  game: GuessTheBalanceGame;
  index: number;
  onGuessSubmitted: () => void;
  isAuthenticated: boolean;
}

export default function GuessTheBalanceCard({
  game,
  index,
  onGuessSubmitted,
  isAuthenticated,
}: GuessTheBalanceCardProps) {
  const [showGuessForm, setShowGuessForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-500";
      case "CLOSED":
        return "bg-yellow-500";
      case "COMPLETED":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "OPEN":
        return "Guessing Open";
      case "CLOSED":
        return "Guessing Closed";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-black/50 backdrop-blur-lg border border-green-500/30 rounded-2xl p-4 sm:p-6 hover:border-green-400/50 transition-all"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-2 sm:space-y-0">
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {game.title || `Bonus Hunt #${game.id.slice(0, 8)}`}
          </h3>
          {game.description && (
            <p className="text-gray-400 text-sm mb-3">{game.description}</p>
          )}
        </div>
        <span
          className={`${getStatusColor(game.status)} px-3 py-1 rounded-full text-white text-xs sm:text-sm font-semibold whitespace-nowrap self-start sm:ml-3`}
        >
          {getStatusText(game.status)}
        </span>
      </div>

      {/* Game Info Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="bg-green-500/10 rounded-lg p-2 sm:p-3">
          <div className="flex items-center mb-1">
            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-1" />
            <p className="text-gray-400 text-xs">Starting Balance</p>
          </div>
          <p className="text-green-400 font-bold text-sm sm:text-lg">
            ${game.startingBalance.toLocaleString()}
          </p>
        </div>

        <div className="bg-purple-500/10 rounded-lg p-2 sm:p-3">
          <div className="flex items-center mb-1">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 mr-1" />
            <p className="text-gray-400 text-xs">Bonuses</p>
          </div>
          <p className="text-purple-400 font-bold text-sm sm:text-lg">
            {game.numberOfBonuses}
          </p>
        </div>

        <div className="bg-blue-500/10 rounded-lg p-2 sm:p-3">
          <div className="flex items-center mb-1">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 mr-1" />
            <p className="text-gray-400 text-xs">Break-even</p>
          </div>
          <p className="text-blue-400 font-bold text-sm sm:text-lg">
            {game.breakEvenMultiplier}x
          </p>
        </div>

        <div className="bg-yellow-500/10 rounded-lg p-2 sm:p-3">
          <div className="flex items-center mb-1">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 mr-1" />
            <p className="text-gray-400 text-xs">Guesses</p>
          </div>
          <p className="text-yellow-400 font-bold text-sm sm:text-lg">
            {game.totalGuesses || 0}
          </p>
        </div>
      </div>

      {/* Guess Form or Status */}
      {game.status === "OPEN" ? (
        !isAuthenticated ? (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-blue-300 font-semibold text-sm sm:text-base">
              Please login with Discord to submit your guess
            </p>
          </div>
        ) : showGuessForm ? (
          <GuessSubmissionForm
            gameId={game.id}
            onSuccess={() => {
              setShowGuessForm(false);
              onGuessSubmitted();
            }}
            onCancel={() => setShowGuessForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowGuessForm(true)}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 sm:py-3 px-4 sm:px-6 rounded-lg transition-all transform hover:scale-105 text-sm sm:text-base min-h-[48px] active:scale-95"
          >
            {game.userHasGuessed ? "Update Your Guess" : "Submit Your Guess"}
          </button>
        )
      ) : game.status === "CLOSED" ? (
        <div className="space-y-2">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-yellow-300 font-semibold text-sm sm:text-base">
              🔒 Guessing closed — waiting for results
            </p>
          </div>
          {game.userGuessAmount != null ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
              <span className="text-gray-400 text-sm">Your locked guess</span>
              <span className="text-green-400 font-bold text-base">
                ${game.userGuessAmount.toLocaleString()}
              </span>
            </div>
          ) : isAuthenticated ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-500 text-sm">You didn't submit a guess for this game</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Timestamps */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-xs text-gray-500">
          {game.openedAt && (
            <span>Opened: {new Date(game.openedAt).toLocaleString()}</span>
          )}
          {game.closedAt && (
            <span>Closed: {new Date(game.closedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
