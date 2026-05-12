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
