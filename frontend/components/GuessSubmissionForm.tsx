"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Loader2, X } from "lucide-react";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";

interface GuessSubmissionFormProps {
  gameId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function GuessSubmissionForm({
  gameId,
  onSuccess,
  onCancel,
}: GuessSubmissionFormProps) {
  const [guessAmount, setGuessAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingGuess, setExistingGuess] = useState<number | null>(null);

  useEffect(() => {
    loadExistingGuess();
  }, [gameId]);

  const loadExistingGuess = async () => {
    try {
      setLoadingExisting(true);
      const guess = await guessTheBalanceApi.getUserGuess(gameId);
      if (guess) {
        setExistingGuess(guess.guessAmount);
        setGuessAmount(guess.guessAmount.toString());
      }
    } catch (err) {
      console.error("Failed to load existing guess:", err);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(guessAmount);

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setLoading(true);
      await guessTheBalanceApi.submitGuess(gameId, {
        guessAmount: amount,
      });
      onSuccess();
    } catch (err: any) {
      console.error("Failed to submit guess:", err);
      setError(
        err?.message || "Failed to submit guess. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit}
      className="bg-gray-800/50 rounded-lg p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-bold text-white">
          {existingGuess ? "Update Your Guess" : "Submit Your Guess"}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {existingGuess && (
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
          <p className="text-blue-300 text-sm">
            Your current guess:{" "}
            <span className="font-bold">${existingGuess.toLocaleString()}</span>
          </p>
        </div>
      )}

      {/* Input */}
      <div>
        <label
          htmlFor="guessAmount"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Final Balance Prediction
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="number"
            id="guessAmount"
            value={guessAmount}
            onChange={(e) => setGuessAmount(e.target.value)}
            step="0.01"
            min="0"
            placeholder="Enter your guess"
            className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={loading}
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter the amount you think the final balance will be
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-3"
        >
          <p className="text-red-300 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : existingGuess ? (
            "Update Guess"
          ) : (
            "Submit Guess"
          )}
        </button>
      </div>
    </motion.form>
  );
}
