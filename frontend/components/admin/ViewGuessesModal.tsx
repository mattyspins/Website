"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Users, Search } from "lucide-react";
import { guessTheBalanceApi } from "@/lib/api/guessTheBalance";
import type { GuessSubmission } from "@/types/guessTheBalance";

interface ViewGuessesModalProps {
  gameId: string;
  gameTitle: string;
  onClose: () => void;
}

export default function ViewGuessesModal({
  gameId,
  gameTitle,
  onClose,
}: ViewGuessesModalProps) {
  const [guesses, setGuesses] = useState<GuessSubmission[]>([]);
  const [filteredGuesses, setFilteredGuesses] = useState<GuessSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"amount" | "time">("amount");

  useEffect(() => {
    loadGuesses();
  }, [gameId]);

  useEffect(() => {
    filterAndSortGuesses();
  }, [guesses, searchTerm, sortBy]);

  const loadGuesses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await guessTheBalanceApi.getAllGuesses(gameId);
      setGuesses(data.guesses);
    } catch (err: any) {
      console.error("Failed to load guesses:", err);
      setError(err?.message || "Failed to load guesses");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortGuesses = () => {
    let filtered = [...guesses];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((guess) =>
        guess.user?.displayName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
    }

    // Sort
    if (sortBy === "amount") {
      filtered.sort((a, b) => a.guessAmount - b.guessAmount);
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
    }

    setFilteredGuesses(filtered);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-400 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-white">{gameTitle}</h2>
                <p className="text-gray-400 text-sm">
                  {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "amount" | "time")}
              className="px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="amount">Sort by Amount</option>
              <option value="time">Sort by Time</option>
            </select>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-center">
                <p className="text-red-300">{error}</p>
              </div>
            ) : filteredGuesses.length === 0 ? (
              <div className="bg-gray-800/50 rounded-lg p-12 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">
                  {searchTerm
                    ? "No guesses match your search"
                    : "No guesses yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGuesses.map((guess, index) => (
                  <motion.div
                    key={guess.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <img
                          src={guess.user?.avatar || "/default-avatar.png"}
                          alt={guess.user?.displayName}
                          className="w-10 h-10 rounded-full border-2 border-blue-500/50 mr-3"
                        />
                        <div className="flex-1">
                          <p className="text-white font-semibold">
                            {guess.user?.displayName || "Unknown User"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Submitted:{" "}
                            {new Date(guess.submittedAt).toLocaleString()}
                          </p>
                          {guess.updatedAt !== guess.submittedAt && (
                            <p className="text-gray-500 text-xs">
                              Updated:{" "}
                              {new Date(guess.updatedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-blue-400">
                          ${guess.guessAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
