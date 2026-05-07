"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Package } from "lucide-react";
import { storeApi } from "@/lib/api/store";
import type { CreateStoreItemRequest } from "@/types/store";

interface CreateStoreItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateStoreItemModal({
  onClose,
  onSuccess,
}: CreateStoreItemModalProps) {
  const [formData, setFormData] = useState<CreateStoreItemRequest>({
    name: "",
    description: "",
    price: 0,
    category: "",
    stock: -1,
    deliveryType: "instant",
    isActive: true,
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Item name is required");
      return;
    }

    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }

    if (formData.price < 0) {
      setError("Price must be non-negative");
      return;
    }

    if (formData.stock !== undefined && formData.stock < -1) {
      setError("Stock must be -1 (unlimited) or positive");
      return;
    }

    try {
      setLoading(true);

      const itemData: CreateStoreItemRequest = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        price: formData.price,
        category: formData.category.trim(),
        stock: formData.stock,
        deliveryType: formData.deliveryType,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      await storeApi.createStoreItem(itemData);
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create store item:", err);
      setError(
        err?.message || "Failed to create store item. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? value === ""
            ? 0
            : Number(value)
          : type === "checkbox"
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto mt-2 sm:mt-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div className="flex items-center mb-2 sm:mb-0">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mr-2 sm:mr-3" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Create Store Item
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
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Item Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Premium Discord Role"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                disabled={loading}
                required
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
                placeholder="Describe what this item includes..."
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                disabled={loading}
              />
            </div>

            {/* Price and Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Price (Points) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  placeholder="1000"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  disabled={loading}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Category <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., Discord Roles"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Stock and Delivery Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stock */}
              <div>
                <label
                  htmlFor="stock"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Stock
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="-1"
                  placeholder="-1 for unlimited"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  -1 for unlimited stock, or enter a positive number
                </p>
              </div>

              {/* Delivery Type */}
              <div>
                <label
                  htmlFor="deliveryType"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Delivery Type
                </label>
                <select
                  id="deliveryType"
                  name="deliveryType"
                  value={formData.deliveryType}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  disabled={loading}
                >
                  <option value="instant">Instant</option>
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            {/* Sort Order and Active Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sort Order */}
              <div>
                <label
                  htmlFor="sortOrder"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Sort Order
                </label>
                <input
                  type="number"
                  id="sortOrder"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex items-center h-10 sm:h-12">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="sr-only"
                      disabled={loading}
                    />
                    <div
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.isActive ? "bg-green-500" : "bg-gray-600"
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.isActive ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </div>
                    <span className="ml-3 text-white text-sm">
                      {formData.isActive ? "Active" : "Inactive"}
                    </span>
                  </label>
                </div>
              </div>
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
                <strong>Note:</strong> Items will be visible to users
                immediately if set to active. Make sure all details are correct
                before creating.
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Item"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
