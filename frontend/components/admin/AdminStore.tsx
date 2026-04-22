"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StoreItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  isActive: boolean;
}

export default function AdminStore() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    // TODO: Implement API call
    // Mock data for now
    setItems([
      {
        id: "1",
        name: "Custom Emote",
        description: "Get a custom emote in chat",
        price: 5000,
        category: "perks",
        stock: -1,
        isActive: true,
      },
      {
        id: "2",
        name: "VIP Badge",
        description: "VIP badge next to your name",
        price: 10000,
        category: "badges",
        stock: -1,
        isActive: true,
      },
      {
        id: "3",
        name: "Shoutout",
        description: "Get a shoutout during stream",
        price: 2000,
        category: "perks",
        stock: 5,
        isActive: true,
      },
    ]);
    setLoading(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    // TODO: Implement API call
    setItems(items.filter((item) => item.id !== itemId));
    alert("Item deleted! (API integration pending)");
  };

  const toggleActive = async (itemId: string) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, isActive: !item.isActive } : item,
      ),
    );
    // TODO: Implement API call
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Store Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
        >
          ➕ Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.02 }}
            className={`rounded-lg p-4 border-2 ${
              item.isActive
                ? "bg-purple-500/10 border-purple-500/30"
                : "bg-gray-500/10 border-gray-500/30 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-white">{item.name}</h3>
              <button
                onClick={() => toggleActive(item.id)}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  item.isActive
                    ? "bg-green-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {item.isActive ? "Active" : "Inactive"}
              </button>
            </div>

            {item.description && (
              <p className="text-gray-400 text-sm mb-3">{item.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Price:</span>
                <span className="text-purple-400 font-semibold">
                  💎 {item.price.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Category:</span>
                <span className="text-white capitalize">{item.category}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Stock:</span>
                <span className="text-white">
                  {item.stock === -1 ? "Unlimited" : item.stock}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(item)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors text-sm font-semibold"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors text-sm font-semibold"
              >
                🗑️ Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Item Modal */}
      {(showCreateModal || editingItem) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  `Item ${editingItem ? "updated" : "created"}! (API integration pending)`,
                );
                setShowCreateModal(false);
                setEditingItem(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Name</label>
                <input
                  type="text"
                  required
                  defaultValue={editingItem?.name}
                  placeholder="e.g., Custom Emote"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Description
                </label>
                <textarea
                  defaultValue={editingItem?.description}
                  placeholder="Item description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">
                    Price
                  </label>
                  <input
                    type="number"
                    required
                    defaultValue={editingItem?.price}
                    placeholder="1000"
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">
                    Stock
                  </label>
                  <input
                    type="number"
                    defaultValue={editingItem?.stock}
                    placeholder="-1 for unlimited"
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Category
                </label>
                <select
                  defaultValue={editingItem?.category}
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="perks">Perks</option>
                  <option value="badges">Badges</option>
                  <option value="cosmetics">Cosmetics</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  {editingItem ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
