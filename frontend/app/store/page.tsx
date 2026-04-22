"use client";

import { motion } from "framer-motion";
import {
  ShoppingBag,
  Coins,
  Gift,
  Zap,
  DollarSign,
  Ticket,
  Star,
  Crown,
} from "lucide-react";
import { useState } from "react";

interface StoreItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: "bonus-buy" | "cash" | "raffle" | "premium";
  icon: any;
  value: string;
  popular: boolean;
  discount?: number;
}

const storeItems: StoreItem[] = [
  // Bonus Buys
  {
    id: 1,
    name: "$25 Bonus Buy",
    description: "Single bonus buy on any slot game",
    price: 500,
    category: "bonus-buy",
    icon: Zap,
    value: "$25",
    popular: true,
  },
  {
    id: 2,
    name: "$50 Bonus Buy",
    description: "Single bonus buy on any slot game",
    price: 950,
    category: "bonus-buy",
    icon: Zap,
    value: "$50",
    popular: false,
    discount: 5,
  },
  {
    id: 3,
    name: "$100 Bonus Buy",
    description: "Single bonus buy on any slot game",
    price: 1800,
    category: "bonus-buy",
    icon: Zap,
    value: "$100",
    popular: true,
    discount: 10,
  },
  {
    id: 4,
    name: "Bonus Buy Pack (5x $25)",
    description: "5 bonus buys of $25 each",
    price: 2200,
    category: "bonus-buy",
    icon: Gift,
    value: "5x $25",
    popular: false,
    discount: 12,
  },

  // Cash Rewards
  {
    id: 5,
    name: "$10 Cash",
    description: "Direct cash to your account",
    price: 1000,
    category: "cash",
    icon: DollarSign,
    value: "$10",
    popular: false,
  },
  {
    id: 6,
    name: "$25 Cash",
    description: "Direct cash to your account",
    price: 2400,
    category: "cash",
    icon: DollarSign,
    value: "$25",
    popular: true,
    discount: 4,
  },
  {
    id: 7,
    name: "$50 Cash",
    description: "Direct cash to your account",
    price: 4700,
    category: "cash",
    icon: DollarSign,
    value: "$50",
    popular: false,
    discount: 6,
  },

  // Raffle Tickets
  {
    id: 8,
    name: "1 Raffle Ticket",
    description: "Entry ticket for current raffles",
    price: 50,
    category: "raffle",
    icon: Ticket,
    value: "1 Ticket",
    popular: false,
  },
  {
    id: 9,
    name: "5 Raffle Tickets",
    description: "Bundle of 5 raffle tickets",
    price: 225,
    category: "raffle",
    icon: Ticket,
    value: "5 Tickets",
    popular: true,
    discount: 10,
  },
  {
    id: 10,
    name: "10 Raffle Tickets",
    description: "Bundle of 10 raffle tickets",
    price: 400,
    category: "raffle",
    icon: Ticket,
    value: "10 Tickets",
    popular: false,
    discount: 20,
  },

  // Premium Items
  {
    id: 11,
    name: "VIP Status (1 Month)",
    description: "Exclusive VIP perks and bonuses",
    price: 5000,
    category: "premium",
    icon: Crown,
    value: "30 Days",
    popular: false,
  },
  {
    id: 12,
    name: "Custom Emote",
    description: "Personal emote in chat",
    price: 1500,
    category: "premium",
    icon: Star,
    value: "Permanent",
    popular: false,
  },
];

const categories = [
  { id: "all", name: "All Items", icon: ShoppingBag },
  { id: "bonus-buy", name: "Bonus Buys", icon: Zap },
  { id: "cash", name: "Cash", icon: DollarSign },
  { id: "raffle", name: "Raffle Tickets", icon: Ticket },
  { id: "premium", name: "Premium", icon: Crown },
];

export default function Store() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [purchaseModal, setPurchaseModal] = useState<StoreItem | null>(null);

  const userPoints = 2450; // This would come from user context/state

  const filteredItems =
    selectedCategory === "all"
      ? storeItems
      : storeItems.filter((item) => item.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "bonus-buy":
        return "text-neon-blue bg-blue-500/20";
      case "cash":
        return "text-green-400 bg-green-500/20";
      case "raffle":
        return "text-neon-gold bg-yellow-500/20";
      case "premium":
        return "text-purple-400 bg-purple-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  const handlePurchase = (item: StoreItem) => {
    if (userPoints >= item.price) {
      setPurchaseModal(item);
    }
  };

  const confirmPurchase = () => {
    // Handle purchase logic here
    setPurchaseModal(null);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 neon-text text-neon-gold">
            🛍️ POINTS STORE
          </h1>
          <p className="text-xl text-gray-300">
            Spend your points on bonus buys, cash rewards, and exclusive items
          </p>
        </motion.div>

        {/* User Points Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glass rounded-xl p-6 mb-8 text-center"
        >
          <div className="flex items-center justify-center space-x-4">
            <Coins className="w-8 h-8 text-neon-gold" />
            <div>
              <div className="text-3xl font-bold text-neon-gold">
                {userPoints.toLocaleString()}
              </div>
              <div className="text-gray-400">Available Points</div>
            </div>
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                selectedCategory === category.id
                  ? "bg-neon-gold text-black"
                  : "glass text-gray-300 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <category.icon className="w-5 h-5" />
              <span>{category.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Store Items Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
              className="glass rounded-xl p-6 hover:scale-105 transition-all duration-300 relative"
            >
              {/* Popular Badge */}
              {item.popular && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-neon-gold text-black px-3 py-1 rounded-full text-xs font-bold">
                    POPULAR
                  </div>
                </div>
              )}

              {/* Discount Badge */}
              {item.discount && (
                <div className="absolute top-4 left-4">
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    -{item.discount}%
                  </div>
                </div>
              )}

              <div className="text-center">
                <div
                  className={`inline-flex p-4 rounded-full mb-4 ${getCategoryColor(item.category)}`}
                >
                  <item.icon className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{item.description}</p>

                <div className="mb-4">
                  <div className="text-2xl font-bold text-neon-gold mb-1">
                    {item.price.toLocaleString()} Points
                  </div>
                  <div className="text-lg text-blue-400">
                    Value: {item.value}
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(item)}
                  disabled={userPoints < item.price}
                  className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
                    userPoints >= item.price
                      ? "bg-gradient-to-r from-neon-gold to-yellow-600 hover:from-yellow-600 hover:to-neon-gold text-black"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {userPoints >= item.price
                    ? "Purchase"
                    : "Insufficient Points"}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Purchase Modal */}
        {purchaseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-8 max-w-md w-full"
            >
              <div className="text-center">
                <div
                  className={`inline-flex p-4 rounded-full mb-4 ${getCategoryColor(purchaseModal.category)}`}
                >
                  <purchaseModal.icon className="w-8 h-8" />
                </div>

                <h3 className="text-2xl font-bold mb-4">
                  {purchaseModal.name}
                </h3>
                <p className="text-gray-400 mb-6">
                  {purchaseModal.description}
                </p>

                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span>Cost:</span>
                    <span className="text-neon-gold font-bold">
                      {purchaseModal.price.toLocaleString()} Points
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span>Your Balance:</span>
                    <span className="text-blue-400">
                      {userPoints.toLocaleString()} Points
                    </span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span>After Purchase:</span>
                      <span className="text-green-400 font-bold">
                        {(userPoints - purchaseModal.price).toLocaleString()}{" "}
                        Points
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setPurchaseModal(null)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPurchase}
                    className="flex-1 bg-gradient-to-r from-neon-gold to-yellow-600 hover:from-yellow-600 hover:to-neon-gold text-black py-3 rounded-lg font-bold transition-all duration-300"
                  >
                    Confirm Purchase
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
