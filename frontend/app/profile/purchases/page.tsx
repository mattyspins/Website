"use client";

import { motion } from "framer-motion";
import { ShoppingBag, Calendar, Coins, Package, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { LoadingError } from "@/components/ui/ErrorState";
import { storeApi } from "@/lib/api/store";

interface Purchase {
  id: string;
  itemName: string;
  itemDescription?: string;
  pointsSpent: number;
  quantity: number;
  purchasedAt: string;
  status: string;
}

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  const breadcrumbItems = [
    { label: "Profile", href: "/profile" },
    { label: "Purchase History" },
  ];

  useEffect(() => {
    checkAuthAndLoadPurchases();
  }, []);

  const checkAuthAndLoadPurchases = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push("/?login=required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const purchaseData = await storeApi.getUserPurchases();

      // Map the purchases to include item details from metadata
      const mappedPurchases = purchaseData.map((purchase: any) => ({
        id: purchase.id,
        itemName: purchase.metadata?.itemName || "Unknown Item",
        itemDescription: purchase.metadata?.itemCategory || "",
        pointsSpent: purchase.totalPrice,
        quantity: purchase.quantity,
        purchasedAt: purchase.purchasedAt,
        status: purchase.status,
      }));

      setPurchases(mappedPurchases);

      // Calculate total spent
      const total = mappedPurchases.reduce(
        (sum: number, purchase: Purchase) => sum + purchase.pointsSpent,
        0,
      );
      setTotalSpent(total);
    } catch (err) {
      console.error("Failed to load purchases:", err);
      setError("Failed to load purchase history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen  p-3 sm:p-6 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={breadcrumbItems} className="mb-6" />
          <LoadingError
            onRetry={checkAuthAndLoadPurchases}
            resource="purchase history"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-3 sm:p-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/profile"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <ShoppingBag className="w-8 h-8 text-purple-400 mr-3" />
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Purchase History
                </h1>
              </div>
              <p className="text-gray-300">
                View all your store purchases and transactions
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Total Spent</p>
              <p className="text-yellow-300 font-bold text-2xl flex items-center justify-center">
                <Coins className="w-6 h-6 mr-2" />
                {totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Purchases List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-xl overflow-hidden"
        >
          {purchases.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No Purchases Yet
              </h3>
              <p className="text-gray-400 mb-6">
                You haven't made any purchases from the store yet.
              </p>
              <a
                href="/store"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Visit Store
              </a>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-900/30 border-b border-purple-500/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                        Item
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                        Description
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        Coins Spent
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        Date
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {purchases.map((purchase, index) => (
                      <motion.tr
                        key={purchase.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-purple-900/10 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="text-white font-semibold">
                            {purchase.itemName}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-400 text-sm">
                            {purchase.itemDescription || "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white">
                            {purchase.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-yellow-400 font-bold flex items-center justify-center">
                            <Coins className="w-4 h-4 mr-1" />
                            {purchase.pointsSpent.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-400 text-sm flex items-center justify-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(
                              purchase.purchasedAt,
                            ).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              purchase.status === "completed"
                                ? "bg-green-500/20 text-green-400"
                                : purchase.status === "pending"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {purchase.status.toUpperCase()}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-700/50">
                {purchases.map((purchase, index) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-purple-900/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">
                          {purchase.itemName}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {purchase.itemDescription || "-"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          purchase.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : purchase.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {purchase.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Quantity</p>
                        <p className="text-white font-semibold">
                          {purchase.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Coins</p>
                        <p className="text-yellow-400 font-bold flex items-center justify-center">
                          <Coins className="w-3 h-3 mr-1" />
                          {purchase.pointsSpent.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Date</p>
                        <p className="text-gray-300 text-sm">
                          {new Date(purchase.purchasedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Summary Stats */}
        {purchases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
          >
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-xl p-6 text-center">
              <Package className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {purchases.length}
              </p>
              <p className="text-gray-400 text-sm">Total Purchases</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 rounded-xl p-6 text-center">
              <Coins className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {totalSpent.toLocaleString()}
              </p>
              <p className="text-gray-400 text-sm">Coins Spent</p>
            </div>
            <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/30 rounded-xl p-6 text-center">
              <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {purchases.filter((p) => p.status === "completed").length}
              </p>
              <p className="text-gray-400 text-sm">Completed Orders</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

