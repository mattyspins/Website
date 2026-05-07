"use client";

import { motion } from "framer-motion";
import {
  Package,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useState } from "react";
import type { StoreItem } from "@/types/store";
import { storeApi } from "@/lib/api/store";
import EditStoreItemModal from "./EditStoreItemModal";
import ConfirmDialog from "./ConfirmDialog";

interface AdminStoreItemCardProps {
  item: StoreItem;
  index: number;
  onUpdate: () => void;
}

export default function AdminStoreItemCard({
  item,
  index,
  onUpdate,
}: AdminStoreItemCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleToggleActive = async () => {
    try {
      setLoading(true);
      await storeApi.updateStoreItem(item.id, {
        isActive: !item.isActive,
      });
      onUpdate();
    } catch (error) {
      console.error("Failed to toggle item status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await storeApi.deleteStoreItem(item.id);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const isOutOfStock = item.stock === 0;
  const isLimitedStock = item.stock > 0 && item.stock <= 10;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-black/50 backdrop-blur-lg border rounded-2xl p-4 sm:p-6 hover:border-purple-400/50 transition-all relative ${
          !item.isActive
            ? "border-gray-600/30 opacity-75"
            : "border-purple-500/30"
        }`}
      >
        {/* Actions Menu */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showActionsMenu && (
            <div className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[150px]">
              <button
                onClick={() => {
                  setShowEditModal(true);
                  setShowActionsMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => {
                  handleToggleActive();
                  setShowActionsMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center"
                disabled={loading}
              >
                {item.isActive ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteDialog(true);
                  setShowActionsMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              item.isActive
                ? "bg-green-500/20 text-green-300"
                : "bg-gray-500/20 text-gray-300"
            }`}
          >
            {item.isActive ? "Active" : "Inactive"}
          </span>
          <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-semibold">
            {item.category}
          </span>
        </div>

        {/* Item Header */}
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate">
            {item.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-purple-400">
              {item.price.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">points</div>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-gray-300 text-sm mb-4 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Item Details */}
        <div className="space-y-3 mb-4">
          {/* Delivery Type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getDeliveryIcon(item.deliveryType)}
              <span className="text-sm text-gray-300 capitalize">
                {item.deliveryType}
              </span>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Stock:</span>
            <div className="text-right">
              {isOutOfStock ? (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Out of Stock</span>
                </div>
              ) : item.stock === -1 ? (
                <span className="text-green-400 text-sm">Unlimited</span>
              ) : (
                <span
                  className={`text-sm ${isLimitedStock ? "text-yellow-400" : "text-green-400"}`}
                >
                  {item.stock} remaining
                </span>
              )}
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Sort Order:</span>
            <span className="text-sm text-white">{item.sortOrder}</span>
          </div>

          {/* Created Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Created:</span>
            <span className="text-sm text-white">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
          <button
            onClick={handleToggleActive}
            className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center ${
              item.isActive
                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
            disabled={loading}
          >
            {item.isActive ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditStoreItemModal
          item={item}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Store Item"
          message={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmColor="red"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          loading={loading}
        />
      )}
    </>
  );
}
