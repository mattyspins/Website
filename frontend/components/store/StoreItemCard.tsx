"use client";

import { motion } from "framer-motion";
import { Package, Star, Clock, Zap, AlertCircle } from "lucide-react";
import type { StoreItem } from "@/types/store";

interface StoreItemCardProps {
  item: StoreItem;
  index: number;
  onPurchase: (item: StoreItem) => void;
  isAuthenticated: boolean;
}

export default function StoreItemCard({
  item,
  index,
  onPurchase,
  isAuthenticated,
}: StoreItemCardProps) {
  const getDeliveryIcon = (deliveryType: string) => {
    switch (deliveryType) {
      case "instant":
        return <Zap className="w-4 h-4 text-green-400" />;
      case "manual":
        return <Package className="w-4 h-4 text-yellow-400" />;
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDeliveryText = (deliveryType: string) => {
    switch (deliveryType) {
      case "instant":
        return "Instant Delivery";
      case "manual":
        return "Manual Delivery";
      case "scheduled":
        return "Scheduled Delivery";
      default:
        return "Standard Delivery";
    }
  };

  const isOutOfStock = item.stock === 0;
  const isLimitedStock = item.stock > 0 && item.stock <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-black/50 backdrop-blur-lg border rounded-2xl p-4 sm:p-6 hover:border-purple-400/50 transition-all ${
        isOutOfStock ? "border-gray-600/30 opacity-60" : "border-purple-500/30"
      }`}
    >
      {/* Item Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3
            className="text-lg sm:text-xl font-bold text-white mb-2 truncate"
            title={item.name}
          >
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-semibold">
              {item.category}
            </span>
            {item.metadata?.featured && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-semibold">
                  Featured
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-2xl font-bold text-purple-400">
            {item.price.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">points</div>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-gray-300 text-sm mb-4 line-clamp-3">
          {item.description}
        </p>
      )}

      {/* Delivery Info */}
      <div className="flex items-center gap-2 mb-4">
        {getDeliveryIcon(item.deliveryType)}
        <span className="text-sm text-gray-300">
          {getDeliveryText(item.deliveryType)}
        </span>
      </div>

      {/* Stock Info */}
      <div className="mb-4">
        {isOutOfStock ? (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Out of Stock</span>
          </div>
        ) : item.stock === -1 ? (
          <div className="text-green-400 text-sm">✓ In Stock (Unlimited)</div>
        ) : (
          <div
            className={`text-sm ${isLimitedStock ? "text-yellow-400" : "text-green-400"}`}
          >
            {isLimitedStock && "⚠️ "}
            {item.stock} remaining
          </div>
        )}
      </div>

      {/* Purchase Button */}
      {!isAuthenticated ? (
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
          <p className="text-blue-300 text-sm font-semibold">
            Login required to purchase
          </p>
        </div>
      ) : isOutOfStock ? (
        <button
          disabled
          className="w-full bg-gray-600 text-gray-400 font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg cursor-not-allowed text-sm sm:text-base"
        >
          Out of Stock
        </button>
      ) : (
        <button
          onClick={() => onPurchase(item)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all transform hover:scale-105 text-sm sm:text-base"
        >
          Purchase Now
        </button>
      )}

      {/* Additional Info */}
      {item.metadata?.tags && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.metadata.tags
            .slice(0, 3)
            .map((tag: string, tagIndex: number) => (
              <span
                key={tagIndex}
                className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs"
              >
                {tag}
              </span>
            ))}
        </div>
      )}
    </motion.div>
  );
}
