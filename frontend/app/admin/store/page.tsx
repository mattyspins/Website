"use client";

import { motion } from "framer-motion";
import {
  ShoppingBag,
  Plus,
  Package,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { storeApi } from "@/lib/api/store";
import type { StoreItem, StoreStatistics } from "@/types/store";
import AdminStoreItemCard from "@/components/admin/AdminStoreItemCard";
import CreateStoreItemModal from "@/components/admin/CreateStoreItemModal";
import AdminPurchases from "@/components/admin/AdminPurchases";

type TabType = "items" | "purchases";

export default function AdminStorePage() {
  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [items, setItems] = useState<StoreItem[]>([]);
  const [statistics, setStatistics] = useState<StoreStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [itemsData, statsData] = await Promise.all([
        storeApi.getStoreItems(undefined, true), // Include inactive items for admin
        storeApi.getStoreStatistics(),
      ]);

      setItems(itemsData);
      setStatistics(statsData);
    } catch (err) {
      console.error("Failed to load store data:", err);
      setError("Failed to load store data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleItemCreated = () => {
    setShowCreateModal(false);
    loadStoreData();
  };

  const handleItemUpdated = () => {
    loadStoreData();
  };

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

  const categories = Array.from(new Set(items.map((item) => item.category)));

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-3 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        >
          <div className="flex items-center mb-4 sm:mb-0">
            <ShoppingBag className="w-8 h-8 text-purple-400 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Store Management
              </h1>
              <p className="text-gray-400">Manage store items and purchases</p>
            </div>
          </div>
          {activeTab === "items" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </button>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-2 mb-6"
        >
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("items")}
              className={`flex-1 px-4 py-3 rounded-lg transition-all duration-300 font-semibold ${
                activeTab === "items"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-purple-600/20"
              }`}
            >
              ðŸ“¦ Store Items
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`flex-1 px-4 py-3 rounded-lg transition-all duration-300 font-semibold ${
                activeTab === "purchases"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-purple-600/20"
              }`}
            >
              ðŸ›’ Purchases
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8 text-center"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Tab Content */}
        {activeTab === "items" ? (
          <>
            {/* Statistics */}
            {statistics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Items</p>
                      <p className="text-2xl font-bold text-white">
                        {statistics.totalItems}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-purple-400" />
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur-lg border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Items</p>
                      <p className="text-2xl font-bold text-white">
                        {statistics.activeItems}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-green-400" />
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Sales</p>
                      <p className="text-2xl font-bold text-white">
                        {statistics.totalPurchases}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Revenue</p>
                      <p className="text-2xl font-bold text-white">
                        {statistics.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-4 sm:p-6 mb-8"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter by Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
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
              transition={{ delay: 0.4 }}
            >
              {filteredItems.length === 0 ? (
                <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8 sm:p-12 text-center">
                  <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">ðŸ“¦</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                    No Items Found
                  </h3>
                  <p className="text-gray-400 text-base sm:text-lg mb-6">
                    {selectedCategory
                      ? `No items found in the "${selectedCategory}" category.`
                      : "No store items have been created yet."}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center mx-auto"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredItems.map((item, index) => (
                    <AdminStoreItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onUpdate={handleItemUpdated}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Top Selling Items */}
            {statistics && statistics.topSellingItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-4 sm:p-6 mt-8"
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Top Selling Items
                </h3>
                <div className="space-y-3">
                  {statistics.topSellingItems.map((item, index) => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-purple-400 mr-3">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-white font-semibold">
                            {item.itemName}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {item.totalSold} sold â€¢{" "}
                            {item.revenue.toLocaleString()} points revenue
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <AdminPurchases />
        )}
      </div>

      {/* Create Item Modal */}
      {showCreateModal && (
        <CreateStoreItemModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleItemCreated}
        />
      )}
    </div>
  );
}

