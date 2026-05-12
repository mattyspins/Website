"use client";

import { motion } from "framer-motion";
import { Clock, AlertCircle } from "lucide-react";
import type { StoreItem } from "@/types/store";

interface StoreItemCardProps {
  item: StoreItem;
  index: number;
  onPurchase: (item: StoreItem) => void;
  isAuthenticated: boolean;
}

function formatTimeRemaining(endDate?: string | null): string | null {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m left`;
  if (h > 0) return `${h}h ${m % 60}m left`;
  return `${m}m left`;
}

export default function StoreItemCard({
  item,
  index,
  onPurchase,
  isAuthenticated,
}: StoreItemCardProps) {
  const isOutOfStock = item.stock === 0;
  const totalStock = (item.metadata as any)?.totalStock ?? item.stock;
  const soldCount = totalStock > 0 ? totalStock - item.stock : 0;
  const timeLeft = formatTimeRemaining((item.metadata as any)?.endDate);

  const stockDisplay =
    item.stock === -1
      ? null
      : `${soldCount >= 0 ? soldCount : "?"}/${totalStock > 0 ? totalStock : "?"}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`bg-navy-800/70 border rounded-xl p-5 flex flex-col transition-all card-hover ${
        isOutOfStock
          ? "border-white/4 opacity-50"
          : "border-white/6 hover:border-gold-500/30"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-white font-semibold text-base leading-tight pr-2">
          {item.name}
        </h3>
        {stockDisplay && (
          <span className="text-gray-400 text-xs font-medium shrink-0 bg-navy-900/60 px-2 py-0.5 rounded">
            {stockDisplay}
          </span>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-gray-500 text-sm mb-3 line-clamp-2 flex-1">
          {item.description}
        </p>
      )}

      {/* Timer */}
      {timeLeft && (
        <div className="flex items-center gap-1.5 text-orange-400 text-xs mb-4">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{timeLeft}</span>
        </div>
      )}

      {/* Out of stock notice */}
      {isOutOfStock && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs mb-4">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Out of stock</span>
        </div>
      )}

      {/* Price + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-gold-400 font-bold text-2xl font-gaming">
            {item.price.toLocaleString()}
          </span>
          <span className="text-gray-500 text-sm">coins</span>
        </div>

        {!isAuthenticated ? (
          <button
            onClick={() => onPurchase(item)}
            className="btn-glow bg-navy-700 hover:bg-navy-600 border border-white/10 hover:border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Log In
          </button>
        ) : isOutOfStock ? (
          <button
            disabled
            className="bg-navy-900 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed"
          >
            Sold Out
          </button>
        ) : (
          <button
            onClick={() => onPurchase(item)}
            className="btn-glow bg-gold-500 hover:bg-gold-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Redeem
          </button>
        )}
      </div>
    </motion.div>
  );
}
