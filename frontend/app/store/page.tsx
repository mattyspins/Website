"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storeApi } from "@/lib/api/store";
import type { StoreItem, StoreCategory } from "@/types/store";
import StoreItemCard from "@/components/store/StoreItemCard";
import PurchaseModal from "@/components/store/PurchaseModal";

export default function StorePage() {
  const router = useRouter();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("access_token"));
    loadStoreData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      const categoriesData = await storeApi.getStoreCategories();
      setCategories(categoriesData);
      await loadItems();
    } catch {
      setError("Failed to load store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const data = await storeApi.getStoreItems(selectedCategory || undefined);
      setItems(data);
    } catch {
      setError("Failed to load items. Please try again.");
    }
  };

  const handlePurchase = (item: StoreItem) => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    setSelectedItem(item);
    setShowPurchaseModal(true);
  };

  const filteredItems = items;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-3 w-12 bg-navy-700 rounded-full animate-pulse mx-auto mb-4" />
            <div className="h-10 w-64 bg-navy-700 rounded-lg animate-pulse mx-auto mb-3" />
            <div className="h-4 w-80 bg-navy-800 rounded animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-navy-800/60 border border-white/5 rounded-xl p-5 h-44 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            Shop
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Spend Your <span className="text-gold-400">Coins</span>
          </h1>
          <p className="text-gray-500 text-base">
            Limited items, exclusive drops. Once they&apos;re gone,
            they&apos;re gone.
          </p>
        </motion.div>

        {/* Category filter */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 justify-center mb-8"
          >
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                !selectedCategory
                  ? "bg-gold-500 text-white"
                  : "bg-navy-800 text-gray-400 hover:text-white border border-white/6"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.category
                    ? "bg-gold-500 text-white"
                    : "bg-navy-800 text-gray-400 hover:text-white border border-white/6"
                }`}
              >
                {cat.category}{" "}
                <span className="opacity-60">({cat.itemCount})</span>
              </button>
            ))}
          </motion.div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={loadStoreData}
              className="text-red-300 hover:text-red-200 text-xs underline mt-1"
            >
              Try again
            </button>
          </div>
        )}

        {/* Items grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredItems.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-500 text-lg mb-2">No items available</p>
              <p className="text-gray-600 text-sm">
                {selectedCategory
                  ? "Try a different category."
                  : "Items will be added soon. Check back later!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, i) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  onPurchase={handlePurchase}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Discord ticket note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 bg-[#5865F2]/10 border border-[#5865F2]/25 rounded-xl p-4 flex items-start gap-3"
        >
          <svg className="w-5 h-5 text-[#5865F2] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <div>
            <p className="text-[#7289DA] font-semibold text-sm">How to claim your reward</p>
            <p className="text-gray-400 text-sm mt-0.5">
              Once you have claimed an item from the shop, please{" "}
              <a
                href="https://discord.gg/n2gCDVwebw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7289DA] hover:text-[#5865F2] underline underline-offset-2 transition-colors"
              >
                open a ticket in our Discord server
              </a>{" "}
              to receive your reward.
            </p>
          </div>
        </motion.div>

        {/* How to earn coins */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-navy-800/40 border border-white/5 rounded-xl p-6"
        >
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
            How to Earn Coins
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">01</span>
              <div>
                <p className="text-gray-300 font-medium">Watch Streams</p>
                <p>
                  Link your Kick account and earn coins for watching live
                  streams
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">02</span>
              <div>
                <p className="text-gray-300 font-medium">Guess the Balance</p>
                <p>Win coin rewards by correctly predicting bonus hunt endings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold-400 mt-0.5">03</span>
              <div>
                <p className="text-gray-300 font-medium">Community Events</p>
                <p>
                  Participate in giveaways and events for bonus coin rewards
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showPurchaseModal && selectedItem && (
        <PurchaseModal
          item={selectedItem}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            setShowPurchaseModal(false);
            setSelectedItem(null);
            loadItems();
          }}
        />
      )}
    </div>
  );
}
