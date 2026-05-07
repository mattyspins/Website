"use client";

import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Package,
  TrendingUp,
  DollarSign,
} from "lucide-react";

export default function AdminStore() {
  const router = useRouter();

  return (
    <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ShoppingBag className="w-8 h-8 text-purple-400 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-white">Store Management</h2>
            <p className="text-gray-400">Manage store items and inventory</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/admin/store")}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center"
        >
          <Package className="w-5 h-5 mr-2" />
          Manage Store
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Store Items</p>
              <p className="text-2xl font-bold text-white">-</p>
            </div>
            <Package className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sales</p>
              <p className="text-2xl font-bold text-white">-</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Revenue</p>
              <p className="text-2xl font-bold text-white">- pts</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/admin/store")}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Item
          </button>

          <button
            onClick={() => router.push("/admin/store")}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center"
          >
            <Package className="w-5 h-5 mr-2" />
            Manage Inventory
          </button>

          <button
            onClick={() => router.push("/store")}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            View Store
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">Store Features</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Create and manage store items with different categories</li>
          <li>• Set prices, stock levels, and delivery types</li>
          <li>• Track sales and revenue in real-time</li>
          <li>• Process refunds and manage customer purchases</li>
          <li>• Automatic point deduction and transaction logging</li>
        </ul>
      </div>
    </div>
  );
}
