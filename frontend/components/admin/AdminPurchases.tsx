"use client";

import { motion } from "framer-motion";
import {
  ShoppingBag,
  User,
  Package,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { storeApi } from "@/lib/api/store";
import { useToast } from "@/components/ui/ToastProvider";

interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: "pending" | "completed" | "refunded" | "failed";
  purchasedAt: string;
  deliveredAt?: string;
  refundedAt?: string;
  refundReason?: string;
  metadata?: {
    itemName: string;
    itemCategory: string;
    userName?: string;
    userDiscordId?: string;
  };
}

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadPurchases();
  }, [statusFilter]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        limit: 100,
        offset: 0,
      };

      if (statusFilter) {
        filters.status = statusFilter;
      }

      const data = await storeApi.getAllPurchases(filters);
      setPurchases(data.purchases || []);
    } catch (err) {
      console.error("Failed to load purchases:", err);
      setError("Failed to load purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPurchase || !refundReason.trim()) {
      showError("Refund Error", "Please provide a refund reason");
      return;
    }

    try {
      await storeApi.processRefund(selectedPurchase.id, refundReason);
      success("Refund Processed", "Purchase refunded successfully");
      setShowRefundModal(false);
      setSelectedPurchase(null);
      setRefundReason("");
      loadPurchases();
    } catch (err) {
      console.error("Refund error:", err);
      showError("Refund Failed", "Failed to process refund");
    }
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      purchase.metadata?.itemName?.toLowerCase().includes(searchLower) ||
      purchase.metadata?.userName?.toLowerCase().includes(searchLower) ||
      purchase.metadata?.userDiscordId?.toLowerCase().includes(searchLower) ||
      purchase.id.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "refunded":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "refunded":
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <p className="text-red-300">{error}</p>
        <button
          onClick={loadPurchases}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item, user, or purchase ID..."
              className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No Purchases Found
          </h3>
          <p className="text-gray-400">
            {searchQuery || statusFilter
              ? "Try adjusting your filters"
              : "No purchases have been made yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase, index) => (
            <motion.div
              key={purchase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4 sm:p-6 hover:border-purple-400/50 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Purchase Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">
                        {purchase.metadata?.itemName || "Unknown Item"}
                      </h4>
                      <p className="text-sm text-gray-400">
                        Purchase ID: {purchase.id.slice(0, 8)}...
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(purchase.status)}`}
                    >
                      {getStatusIcon(purchase.status)}
                      {purchase.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Customer</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-400" />
                        <p
                          className="text-sm text-white truncate"
                          title={purchase.metadata?.userName}
                        >
                          {purchase.metadata?.userName || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quantity</p>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        <p className="text-sm text-white">
                          {purchase.quantity}x
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total</p>
                      <p className="text-sm font-bold text-yellow-400">
                        {purchase.totalPrice.toLocaleString()} pts
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-white">
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {purchase.refundReason && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-xs text-red-400 font-semibold mb-1">
                        Refund Reason:
                      </p>
                      <p className="text-sm text-red-300">
                        {purchase.refundReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {purchase.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await storeApi.completePurchase(purchase.id);
                          success(
                            "Purchase Completed",
                            "Purchase marked as completed successfully",
                          );
                          loadPurchases();
                        } catch (err) {
                          console.error("Complete purchase error:", err);
                          showError(
                            "Complete Failed",
                            "Failed to complete purchase",
                          );
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Completed
                    </button>
                  </div>
                )}
                {purchase.status === "completed" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedPurchase(purchase);
                        setShowRefundModal(true);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
                    >
                      Process Refund
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-900 to-black border border-red-500/30 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Process Refund
            </h3>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-300 mb-2">
                <strong>Item:</strong> {selectedPurchase.metadata?.itemName}
              </p>
              <p className="text-sm text-red-300 mb-2">
                <strong>Customer:</strong> {selectedPurchase.metadata?.userName}
              </p>
              <p className="text-sm text-red-300">
                <strong>Refund Amount:</strong>{" "}
                {selectedPurchase.totalPrice.toLocaleString()} coins
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Refund Reason *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRefund}
                disabled={!refundReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 rounded-lg transition-colors"
              >
                Confirm Refund
              </button>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedPurchase(null);
                  setRefundReason("");
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
