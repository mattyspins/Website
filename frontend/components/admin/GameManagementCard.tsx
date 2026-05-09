"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Play,
  Square,
  Trophy,
  Eye,
  Trash2,
  Loader2,
  UserX,
} from "lucide-react";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";
import { GuessTheBalanceStatus } from "@/types/guessTheBalance";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";
import ViewGuessesModal from "./ViewGuessesModal";
import CompleteGameModal from "./CompleteGameModal";
import DisqualifyWinnerModal from "./DisqualifyWinnerModal";
import ConfirmDialog from "./ConfirmDialog";

interface GameManagementCardProps {
  game: GuessTheBalanceGame;
  index: number;
  onGameUpdated: () => void;
  onGameDeleted: () => void;
}

export default function GameManagementCard({
  game,
  index,
  onGameUpdated,
  onGameDeleted,
}: GameManagementCardProps) {
  const [loading, setLoading] = useState(false);
  const [showViewGuesses, setShowViewGuesses] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
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

  const handleOpenGuessing = async () => {
    try {
      setLoading(true);
      setError(null);
      await guessTheBalanceApi.openGuessing(game.id);
      onGameUpdated();
    } catch (err: any) {
      console.error("Failed to open guessing:", err);
      setError(err?.message || "Failed to open guessing");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseGuessing = async () => {
    try {
      setLoading(true);
      setError(null);
      await guessTheBalanceApi.closeGuessing(game.id);
      setShowCloseConfirm(false);
      onGameUpdated();
    } catch (err: any) {
      console.error("Failed to close guessing:", err);
      setError(err?.message || "Failed to close guessing");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async () => {
    try {
      setLoading(true);
      setError(null);
      await guessTheBalanceApi.deleteGame(game.id);
      setShowDeleteConfirm(false);
      onGameDeleted();
    } catch (err: any) {
      console.error("Failed to delete game:", err);
      setError(err?.message || "Failed to delete game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400/50 transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              {game.title || `Game #${game.id.slice(0, 8)}`}
            </h3>
            {game.description && (
              <p className="text-gray-400 text-sm mb-3">{game.description}</p>
            )}
          </div>
          <span
            className={`${getStatusColor(game.status)} px-3 py-1 rounded-full text-white text-sm font-semibold whitespace-nowrap ml-3`}
          >
            {game.status}
          </span>
        </div>

        {/* Game Info Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          <div className="bg-green-500/10 rounded-lg p-2 sm:p-3">
            <div className="flex items-center mb-1">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-1" />
              <p className="text-gray-400 text-xs">Starting</p>
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

        {/* Winner Info (if completed) */}
        {game.status === GuessTheBalanceStatus.COMPLETED && game.winner && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <Trophy className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-white font-semibold text-sm truncate"
                    title={game.winner.displayName}
                  >
                    {game.winner.displayName}
                  </p>
                  <p className="text-yellow-400 text-xs">
                    Guess: ${game.winner.guessAmount.toLocaleString()} (±$
                    {game.winner.difference.toLocaleString()})
                  </p>
                </div>
              </div>
              {game.winner.reward > 0 && (
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-semibold">
                  {game.winner.reward} pts
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {game.status === GuessTheBalanceStatus.DRAFT && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleOpenGuessing}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Open Guessing</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {game.status === GuessTheBalanceStatus.OPEN && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setShowViewGuesses(true)}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                <Eye className="w-4 h-4" />
                <span>View Guesses</span>
              </button>
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Close Guessing</span>
                  </>
                )}
              </button>
            </div>
          )}

          {game.status === GuessTheBalanceStatus.CLOSED && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setShowViewGuesses(true)}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                <Eye className="w-4 h-4" />
                <span>View Guesses</span>
              </button>
              <button
                onClick={() => setShowCompleteModal(true)}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-all text-sm sm:text-base"
              >
                <Trophy className="w-4 h-4" />
                <span>Draw Winner</span>
              </button>
            </div>
          )}

          {game.status === GuessTheBalanceStatus.COMPLETED && (
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setShowViewGuesses(true)}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                <Eye className="w-4 h-4" />
                <span>View Guesses</span>
              </button>
              {game.winner && (
                <button
                  onClick={() => setShowDisqualifyModal(true)}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  <UserX className="w-4 h-4" />
                  <span>Disqualify Winner</span>
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <span className="block">Created:</span>
              <span>{new Date(game.createdAt).toLocaleString()}</span>
            </div>
            {game.completedAt && (
              <div>
                <span className="block">Completed:</span>
                <span>{new Date(game.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {showViewGuesses && (
        <ViewGuessesModal
          gameId={game.id}
          gameTitle={game.title || `Game #${game.id.slice(0, 8)}`}
          onClose={() => setShowViewGuesses(false)}
        />
      )}

      {showCompleteModal && (
        <CompleteGameModal
          game={game}
          onClose={() => setShowCompleteModal(false)}
          onSuccess={() => {
            setShowCompleteModal(false);
            onGameUpdated();
          }}
        />
      )}

      {showDisqualifyModal && (
        <DisqualifyWinnerModal
          game={game}
          onClose={() => setShowDisqualifyModal(false)}
          onSuccess={() => {
            setShowDisqualifyModal(false);
            onGameUpdated();
          }}
        />
      )}

      {showCloseConfirm && (
        <ConfirmDialog
          title="Close Guessing"
          message="Are you sure you want to close guessing? Users will no longer be able to submit or update their guesses."
          confirmText="Close Guessing"
          confirmColor="yellow"
          onConfirm={handleCloseGuessing}
          onCancel={() => setShowCloseConfirm(false)}
          loading={loading}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Game"
          message={
            game.status === GuessTheBalanceStatus.COMPLETED
              ? "Are you sure you want to delete this completed game? This will permanently remove the game and all associated guesses. This action cannot be undone."
              : "Are you sure you want to delete this game? This action cannot be undone."
          }
          confirmText="Delete Game"
          confirmColor="red"
          onConfirm={handleDeleteGame}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={loading}
        />
      )}
    </>
  );
}
