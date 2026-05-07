"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { storeApi } from "@/lib/api/store";
import type { StoreItem } from "@/types/store";

interface PurchaseModalProps {
  item: StoreItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseModal({
  item,
  onClose,
  onSuccess,
}: PurchaseModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    // Get user points from localStorage or API
    const userInfo = localStorage.getItem("user_info");
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setUserPoints(user.points || 0);
      } catch (err) {
        console.error("Failed to parse user info:", err);
      }
    }
  }, []);

  const totalPrice = quantity * item.price;
  const canAfford = userPoints >= totalPrice;
  const maxQuantity = item.stock === -1 ? 10 : Math.min(item.stock, 10);

  const handlePurchase = async () => {
    if (!canAfford) {
      setError("Insufficient points for this purchase");
      return;
    }

    if (quantity <= 0 || quantity > maxQuantity) {
      setError(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await storeApi.purchaseItem({
        itemId: item.id,
        quantity,
      });

      // Update user points in localStorage
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          user.points = (user.points || 0) - totalPrice;
          localStorage.setItem("user_info", JSON.stringify(user));
        } catch (err) {
          console.error("Failed to update user points:", err);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error("Failed to purchase item:", err);
      setError(err?.message || "Failed to purchase item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl p-4 sm:p-6 w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center">
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mr-2 sm:mr-3" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Purchase Item
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Item Info */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-gray-400 text-xs sm:text-sm mb-2">
                {item.description}
              </p>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Price per item:</span>
              <span className="text-purple-400 font-semibold">
                {item.price.toLocaleString()} points
              </span>
            </div>
            {item.stock !== -1 && (
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-400">Available:</span>
                <span className="text-green-400 font-semibold">
                  {item.stock} remaining
                </span>
              </div>
            )}
          </div>

          {/* Quantity Selection */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="bg-gray-700 hover:bg-gray-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                disabled={loading || quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(maxQuantity, value)));
                }}
                min="1"
                max={maxQuantity}
                className="w-16 text-center bg-gray-900/50 border border-gray-600 rounded-lg text-white py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                className="bg-gray-700 hover:bg-gray-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                disabled={loading || quantity >= maxQuantity}
              >
                +
              </button>
              <span className="text-gray-400 text-sm ml-2">
                Max: {maxQuantity}
              </span>
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Your Points:</span>
              <span className="text-white font-semibold">
                {userPoints.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Total Cost:</span>
              <span className="text-purple-400 font-semibold">
                {totalPrice.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">After Purchase:</span>
                <span
                  className={`font-semibold ${canAfford ? "text-green-400" : "text-red-400"}`}
                >
                  {(userPoints - totalPrice).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Insufficient Points Warning */}
          {!canAfford && !error && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-300 text-sm">
                  You need {(totalPrice - userPoints).toLocaleString()} more
                  points for this purchase.
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
              disabled={loading || !canAfford}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Purchase
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
