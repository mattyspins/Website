"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";
import type { GuessTheBalanceGame } from "@/types/guessTheBalance";

interface DisqualifyWinnerModalProps {
  game: GuessTheBalanceGame;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisqualifyWinnerModal({
  game,
  onClose,
  onSuccess,
}: DisqualifyWinnerModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("Please provide a reason for disqualification");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await guessTheBalanceApi.disqualifyWinner(game.id, reason.trim());
      onSuccess();
    } catch (err: any) {
      console.error("Failed to disqualify winner:", err);
      setError(
        err?.message || "Failed to disqualify winner. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                Disqualify Winner
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Select next closest guess
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Winner Info */}
        {game.winner && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Current Winner</p>
            <p className="text-white font-semibold">
              {game.winner.displayName}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Guess: ${game.winner.guessAmount.toLocaleString()} (±$
              {game.winner.difference.toLocaleString()})
            </p>
            {game.winner.reward > 0 && (
              <p className="text-sm text-yellow-400 mt-1">
                Reward: {game.winner.reward} points (will be refunded)
              </p>
            )}
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <p className="text-yellow-400 text-sm">
            <strong>Warning:</strong> This action will:
          </p>
          <ul className="text-yellow-400 text-sm mt-2 space-y-1 ml-4 list-disc">
            <li>Disqualify the current winner</li>
            <li>Refund their points (if awarded)</li>
            <li>Select the next closest guess as winner</li>
            <li>Award points to the new winner</li>
            <li>This cannot be undone</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Reason for Disqualification *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Bot account, Terms violation, Duplicate account..."
              className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
              rows={3}
              disabled={loading}
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              This reason will be logged for record keeping
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Disqualify & Select New Winner"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
