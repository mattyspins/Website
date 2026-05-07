"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Target } from "lucide-react";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";

interface CreateGameModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateGameModal({
  onClose,
  onSuccess,
}: CreateGameModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startingBalance: "",
    numberOfBonuses: "",
    breakEvenMultiplier: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const startingBalance = parseFloat(formData.startingBalance);
    const numberOfBonuses = parseInt(formData.numberOfBonuses);
    const breakEvenMultiplier = parseFloat(formData.breakEvenMultiplier);

    if (isNaN(startingBalance) || startingBalance <= 0) {
      setError("Starting balance must be greater than 0");
      return;
    }

    if (isNaN(numberOfBonuses) || numberOfBonuses <= 0) {
      setError("Number of bonuses must be greater than 0");
      return;
    }

    if (isNaN(breakEvenMultiplier) || breakEvenMultiplier <= 0) {
      setError("Break-even multiplier must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      const gameData = {
        title: formData.title || undefined,
        description: formData.description || undefined,
        startingBalance,
        numberOfBonuses,
        breakEvenMultiplier,
      };

      console.log("[Modal] Creating game with data:", gameData);

      const result = await guessTheBalanceApi.createGame(gameData);

      console.log("[Modal] Game created successfully:", result);

      if (!result || !result.id) {
        throw new Error("Invalid game data returned from server");
      }

      onSuccess();
    } catch (err: any) {
      console.error("[Modal] Failed to create game:", err);
      console.error("[Modal] Error details:", {
        message: err?.message,
        stack: err?.stack,
        response: err?.response,
      });

      // Check for rate limit error
      if (err?.message?.includes("Too many games")) {
        setError("Rate limit reached. Please wait before creating more games.");
      } else if (
        err?.message?.includes("breakEvenMultiplier") ||
        err?.message?.includes("too_big")
      ) {
        setError(
          "Break-even multiplier must be between 0.01 and 10 (e.g., 0.96)",
        );
      } else if (err?.message?.includes("startingBalance")) {
        setError("Starting balance must be greater than 0");
      } else if (err?.message?.includes("numberOfBonuses")) {
        setError("Number of bonuses must be between 1 and 1000");
      } else {
        setError(err?.message || "Failed to create game. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30 rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto mt-2 sm:mt-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div className="flex items-center mb-2 sm:mb-0">
              <Target className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mr-2 sm:mr-3" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Create New Game
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Game Title <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Epic Bonus Hunt #1"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Description <span className="text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., 100 bonuses on Gates of Olympus - Can you guess the final balance?"
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm sm:text-base"
                disabled={loading}
              />
            </div>

            {/* Starting Balance */}
            <div>
              <label
                htmlFor="startingBalance"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Starting Balance <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  id="startingBalance"
                  name="startingBalance"
                  value={formData.startingBalance}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="1000.00"
                  className="w-full pl-8 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The balance before opening any bonuses
              </p>
            </div>

            {/* Number of Bonuses */}
            <div>
              <label
                htmlFor="numberOfBonuses"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Number of Bonuses <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="numberOfBonuses"
                name="numberOfBonuses"
                value={formData.numberOfBonuses}
                onChange={handleChange}
                min="1"
                placeholder="100"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Total number of slot bonuses to open
              </p>
            </div>

            {/* Break-even Multiplier */}
            <div>
              <label
                htmlFor="breakEvenMultiplier"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Break-even Multiplier <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="breakEvenMultiplier"
                  name="breakEvenMultiplier"
                  value={formData.breakEvenMultiplier}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.96"
                  className="w-full pr-8 pl-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400">
                  x
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Average multiplier needed to break even
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
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>Note:</strong> The game will be created in DRAFT status.
                You can open guessing when you're ready to start the bonus hunt.
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
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Game"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
