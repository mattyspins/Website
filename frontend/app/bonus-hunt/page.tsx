"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Zap,
  Users,
  Trophy,
  Coins,
} from "lucide-react";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface BonusHunt {
  id: number;
  game: string;
  buyIn: number;
  multiplier: number;
  payout: number;
  status: "active" | "completed" | "pending";
  timestamp: string;
}

interface HuntStats {
  totalInvested: number;
  totalPayout: number;
  profit: number;
  winRate: number;
  bestMultiplier: number;
  activeHunts: number;
}

interface Prediction {
  id: number;
  user: string;
  predictedBalance: number;
  betAmount: number;
  timestamp: string;
  status: "active" | "won" | "lost";
}

interface UserProfile {
  points: number;
  totalBets: number;
  correctPredictions: number;
  rank: number;
}

const mockHunts: BonusHunt[] = [
  {
    id: 1,
    game: "Sweet Bonanza",
    buyIn: 100,
    multiplier: 156.7,
    payout: 15670,
    status: "completed",
    timestamp: "2024-01-15 14:30",
  },
  {
    id: 2,
    game: "Gates of Olympus",
    buyIn: 200,
    multiplier: 89.2,
    payout: 17840,
    status: "completed",
    timestamp: "2024-01-15 13:15",
  },
  {
    id: 3,
    game: "Sugar Rush",
    buyIn: 150,
    multiplier: 0,
    payout: 0,
    status: "active",
    timestamp: "2024-01-15 15:45",
  },
  {
    id: 4,
    game: "Starlight Princess",
    buyIn: 300,
    multiplier: 234.5,
    payout: 70350,
    status: "completed",
    timestamp: "2024-01-15 12:00",
  },
  {
    id: 5,
    game: "Fruit Party",
    buyIn: 75,
    multiplier: 45.8,
    payout: 3435,
    status: "completed",
    timestamp: "2024-01-15 11:30",
  },
];

const chartData = [
  { time: "10:00", profit: -500 },
  { time: "11:00", profit: 2000 },
  { time: "12:00", profit: 15000 },
  { time: "13:00", profit: 28000 },
  { time: "14:00", profit: 45000 },
  { time: "15:00", profit: 42000 },
];

const gameStats = [
  { game: "Sweet Bonanza", hunts: 15, avgMultiplier: 89.5 },
  { game: "Gates of Olympus", hunts: 12, avgMultiplier: 76.2 },
  { game: "Sugar Rush", hunts: 8, avgMultiplier: 134.7 },
  { game: "Starlight Princess", hunts: 6, avgMultiplier: 156.3 },
];

const mockPredictions: Prediction[] = [
  {
    id: 1,
    user: "GamerPro",
    predictedBalance: 150000,
    betAmount: 500,
    timestamp: "2 min ago",
    status: "active",
  },
  {
    id: 2,
    user: "LuckySpins",
    predictedBalance: 125000,
    betAmount: 750,
    timestamp: "5 min ago",
    status: "active",
  },
  {
    id: 3,
    user: "BonusHunter",
    predictedBalance: 200000,
    betAmount: 1000,
    timestamp: "8 min ago",
    status: "active",
  },
  {
    id: 4,
    user: "SlotMaster",
    predictedBalance: 95000,
    betAmount: 300,
    timestamp: "12 min ago",
    status: "won",
  },
];

const userProfile: UserProfile = {
  points: 2450,
  totalBets: 23,
  correctPredictions: 14,
  rank: 7,
};

export default function BonusHunt() {
  const [selectedTab, setSelectedTab] = useState("active");
  const [predictionAmount, setPredictionAmount] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [showPredictionForm, setShowPredictionForm] = useState(false);

  const stats: HuntStats = {
    totalInvested: 2450,
    totalPayout: 107295,
    profit: 104845,
    winRate: 78.5,
    bestMultiplier: 234.5,
    activeHunts: 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-neon-blue bg-blue-500/20";
      case "completed":
        return "text-green-400 bg-green-500/20";
      case "pending":
        return "text-yellow-400 bg-yellow-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
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
          <h1 className="text-5xl font-bold mb-4 neon-text text-neon-pink">
            BONUS HUNT
          </h1>
          <p className="text-xl text-gray-300">
            Track your bonus buys and maximize your wins
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          <div className="glass rounded-xl p-4 text-center">
            <DollarSign className="w-8 h-8 text-neon-blue mx-auto mb-2" />
            <div className="text-2xl font-bold text-neon-blue">
              ${stats.totalInvested.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Invested</div>
          </div>

          <div className="glass rounded-xl p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              ${stats.totalPayout.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Payout</div>
          </div>

          <div className="glass rounded-xl p-4 text-center">
            <Target className="w-8 h-8 text-neon-pink mx-auto mb-2" />
            <div className="text-2xl font-bold text-neon-pink">
              ${stats.profit.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Profit</div>
          </div>

          <div className="glass rounded-xl p-4 text-center">
            <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">
              {stats.winRate}%
            </div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>

          <div className="glass rounded-xl p-4 text-center">
            <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-400">
              {stats.bestMultiplier}x
            </div>
            <div className="text-sm text-gray-400">Best Multi</div>
          </div>

          <div className="glass rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-400">
              {stats.activeHunts}
            </div>
            <div className="text-sm text-gray-400">Active</div>
          </div>
        </motion.div>

        {/* User Profile & Prediction Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Profile */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-neon-gold" />
              <h3 className="text-xl font-bold">Your Profile</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Points:</span>
                <span className="text-2xl font-bold text-neon-gold">
                  {userProfile.points.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Rank:</span>
                <span className="text-lg font-semibold text-blue-400">
                  #{userProfile.rank}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Win Rate:</span>
                <span className="text-lg font-semibold text-green-400">
                  {Math.round(
                    (userProfile.correctPredictions / userProfile.totalBets) *
                      100,
                  )}
                  %
                </span>
              </div>

              <div className="text-sm text-gray-500">
                {userProfile.correctPredictions}/{userProfile.totalBets} correct
                predictions
              </div>
            </div>
          </motion.div>

          {/* Prediction Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-6 h-6 text-neon-blue" />
              <h3 className="text-xl font-bold">Make Prediction</h3>
            </div>

            {!showPredictionForm ? (
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Predict the final balance and bet your points!
                </p>
                <button
                  onClick={() => setShowPredictionForm(true)}
                  className="btn-glow bg-gradient-to-r from-neon-blue to-blue-600 hover:from-blue-600 hover:to-neon-gold text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  <Trophy className="w-5 h-5 inline mr-2" />
                  Place Bet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Predicted Final Balance
                  </label>
                  <input
                    type="number"
                    value={predictionAmount}
                    onChange={(e) => setPredictionAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-neon-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Bet Amount (Points)
                  </label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter points..."
                    max={userProfile.points}
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-neon-gold focus:outline-none"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Max: {userProfile.points.toLocaleString()} points
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      // Handle prediction submission
                      setShowPredictionForm(false);
                      setPredictionAmount("");
                      setBetAmount("");
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowPredictionForm(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Live Predictions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Coins className="w-6 h-6 text-neon-gold" />
              <h3 className="text-xl font-bold">Live Predictions</h3>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {mockPredictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  className={`p-3 rounded-lg border ${
                    prediction.status === "active"
                      ? "bg-blue-500/10 border-blue-500/30"
                      : prediction.status === "won"
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">
                      {prediction.user}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        prediction.status === "active"
                          ? "bg-blue-500/20 text-blue-400"
                          : prediction.status === "won"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {prediction.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1">
                    <div>
                      Prediction: $
                      {prediction.predictedBalance.toLocaleString()}
                    </div>
                    <div>Bet: {prediction.betAmount} points</div>
                    <div>{prediction.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Profit Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-6">Profit Timeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#00f5ff"
                strokeWidth={3}
                dot={{ fill: "#00f5ff", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Hunts */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold">Recent Hunts</h2>
            </div>

            <div className="p-6 space-y-4">
              {mockHunts.map((hunt, index) => (
                <motion.div
                  key={hunt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                  className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{hunt.game}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(hunt.status)}`}
                    >
                      {hunt.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Buy-in: </span>
                      <span className="text-white">${hunt.buyIn}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Multiplier: </span>
                      <span className="text-neon-blue">{hunt.multiplier}x</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Payout: </span>
                      <span className="text-green-400">
                        ${hunt.payout.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">P&L: </span>
                      <span
                        className={
                          hunt.payout - hunt.buyIn > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        ${(hunt.payout - hunt.buyIn).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    {hunt.timestamp}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Game Statistics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold">Game Performance</h2>
            </div>

            <div className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gameStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="game"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="avgMultiplier" fill="#ff0080" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
