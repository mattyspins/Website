"use client";

import { motion } from "framer-motion";
import { ShoppingBag, Package, Star, Filter, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    checkAuth();
    loadStoreData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  const checkAuth = () => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
  };

  const loadStoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesData] = await Promise.all([
        storeApi.getStoreCategories(),
      ]);

      setCategories(categoriesData);
      await loadItems();
    } catch (err) {
      console.error("Failed to load store data:", err);
      setError("Failed to load store. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const itemsData = await storeApi.getStoreItems(
        selectedCategory || undefined,
      );
      setItems(itemsData);
    } catch (err) {
      console.error("Failed to load items:", err);
      setError("Failed to load items. Please try again later.");
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

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    setSelectedItem(null);
    // Optionally reload items to update stock
    loadItems();
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-3 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 sm:w-16 sm:h-16 text-purple-400 mb-2 sm:mb-0 sm:mr-4" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center sm:text-left">
              Points Store
            </h1>
          </div>
          <p className="text-gray-300 text-base sm:text-lg">
            Spend your points on exclusive rewards and prizes!
          </p>
        </motion.div>

        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-blue-300">
              Please{" "}
              <button
                onClick={() => router.push("/")}
                className="underline font-semibold hover:text-blue-200"
              >
                login with Discord
              </button>{" "}
              to purchase items from the store!
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-4 sm:p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.category} value={category.category}>
                    {category.category} ({category.itemCount})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Store Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredItems.length === 0 ? (
            <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8 sm:p-12 text-center">
              <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">🛍️</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                {searchQuery || selectedCategory
                  ? "No Items Found"
                  : "Store Coming Soon"}
              </h3>
              <p className="text-gray-400 text-base sm:text-lg">
                {searchQuery || selectedCategory
                  ? "Try adjusting your search or filter criteria."
                  : "Items will be added to the store soon. Check back later!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredItems.map((item, index) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onPurchase={handlePurchase}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* How to Earn Points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-500/10 to-green-500/10 border border-purple-500/30 rounded-2xl p-4 sm:p-6 mt-8"
        >
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3">
            How to Earn Points
          </h3>
          <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
            <li className="flex items-start">
              <span className="text-purple-400 mr-2 flex-shrink-0">•</span>
              <span>
                <strong>Watch Streams:</strong> Earn points by watching live
                streams
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-2 flex-shrink-0">•</span>
              <span>
                <strong>Participate in Games:</strong> Win points in Guess the
                Balance and other games
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-2 flex-shrink-0">•</span>
              <span>
                <strong>Join Leaderboards:</strong> Compete for top positions to
                earn bonus points
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-2 flex-shrink-0">•</span>
              <span>
                <strong>Daily Activities:</strong> Complete daily challenges and
                activities
              </span>
            </li>
          </ul>
        </motion.div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedItem && (
        <PurchaseModal
          item={selectedItem}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedItem(null);
          }}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
