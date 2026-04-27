"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/lib/api";

interface Raffle {
  id: string;
  title: string;
  description?: string;
  prize: string;
  ticketPrice: number;
  maxTickets: number;
  maxEntriesPerUser: number;
  numberOfWinners: number;
  ticketsSold: number;
  status: string;
  endsAt: string;
}

export default function AdminRaffles() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);

  useEffect(() => {
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.RAFFLES_ACTIVE, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRaffles(data.data.raffles || []);
      }
    } catch (error) {
      console.error("Failed to load raffles:", error);
    }
    setLoading(false);
  };

  const selectWinner = async (raffleId: string, numberOfWinners: number) => {
    if (
      !confirm(
        `Are you sure you want to select ${numberOfWinners} winner(s) for this raffle?`,
      )
    ) {
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch(
        API_ENDPOINTS.RAFFLES_SELECT_WINNERS(raffleId),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}), // Uses raffle's numberOfWinners
        },
      );

      if (response.ok) {
        const data = await response.json();
        alert(
          `${data.data.winners.length} winner(s) selected successfully!\n\nWinners:\n${data.data.winners.map((w: any, i: number) => `${i + 1}. User ID: ${w.userId}`).join("\n")}`,
        );
        loadRaffles();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Failed to select winners");
      }
    } catch (error) {
      console.error("Failed to select winners:", error);
      alert("Failed to select winners");
    }
  };

  const endRaffle = async (raffleId: string) => {
    if (!confirm("Are you sure you want to end this raffle?")) {
      return;
    }

    // TODO: Implement API call
    alert("Raffle ended! (API integration pending)");
    console.log("Ending raffle:", raffleId);
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
        <h2 className="text-2xl font-bold text-white">Raffle Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
        >
          ➕ Create Raffle
        </button>
      </div>

      <div className="space-y-4">
        {raffles.map((raffle) => (
          <motion.div
            key={raffle.id}
            whileHover={{ scale: 1.01 }}
            className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {raffle.title}
                </h3>
                {raffle.description && (
                  <p className="text-gray-400 text-sm mb-2">
                    {raffle.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-purple-400">🎁 {raffle.prize}</span>
                  <span className="text-gray-400">
                    💎 {raffle.ticketPrice} points/ticket
                  </span>
                  <span className="text-yellow-400">
                    🏆 {raffle.numberOfWinners} winner
                    {raffle.numberOfWinners > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  raffle.status === "active"
                    ? "bg-green-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {raffle.status.toUpperCase()}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Tickets Sold</span>
                <span className="text-white font-semibold">
                  {raffle.ticketsSold} / {raffle.maxTickets}
                </span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(raffle.ticketsSold / raffle.maxTickets) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">
                Ends: {new Date(raffle.endsAt).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    selectWinner(raffle.id, raffle.numberOfWinners)
                  }
                  disabled={raffle.ticketsSold === 0}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-1 rounded transition-colors text-sm font-semibold"
                >
                  🎲 Select {raffle.numberOfWinners} Winner
                  {raffle.numberOfWinners > 1 ? "s" : ""}
                </button>
                <button
                  onClick={() => endRaffle(raffle.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded transition-colors text-sm font-semibold"
                >
                  🛑 End Raffle
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Raffle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Create New Raffle
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const accessToken = localStorage.getItem("access_token");

                if (!accessToken) {
                  alert("Please login first");
                  return;
                }

                try {
                  const response = await fetch(API_ENDPOINTS.RAFFLES_CREATE, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      title: formData.get("title"),
                      description: formData.get("description"),
                      prize: formData.get("prize"),
                      ticketPrice: parseInt(
                        formData.get("ticketPrice") as string,
                      ),
                      maxTickets: parseInt(
                        formData.get("maxTickets") as string,
                      ),
                      maxEntriesPerUser: parseInt(
                        formData.get("maxEntriesPerUser") as string,
                      ),
                      numberOfWinners: parseInt(
                        formData.get("numberOfWinners") as string,
                      ),
                      endDate: formData.get("endDate"),
                    }),
                  });

                  if (response.ok) {
                    alert("Raffle created successfully!");
                    setShowCreateModal(false);
                    loadRaffles();
                  } else {
                    const data = await response.json();
                    alert(data.error?.message || "Failed to create raffle");
                  }
                } catch (error) {
                  console.error("Failed to create raffle:", error);
                  alert("Failed to create raffle");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Weekly Giveaway"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Description (optional)
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g., Win amazing prizes!"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Prize
                </label>
                <input
                  type="text"
                  name="prize"
                  required
                  placeholder="e.g., 10,000 Points"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">
                    Ticket Price (points)
                  </label>
                  <input
                    type="number"
                    name="ticketPrice"
                    required
                    min="1"
                    placeholder="100"
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">
                    Max Tickets
                  </label>
                  <input
                    type="number"
                    name="maxTickets"
                    required
                    min="1"
                    placeholder="100"
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Number of Winners
                </label>
                <input
                  type="number"
                  name="numberOfWinners"
                  required
                  min="1"
                  defaultValue="1"
                  placeholder="1"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many winners will be randomly selected
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Max Entries Per User
                </label>
                <input
                  type="number"
                  name="maxEntriesPerUser"
                  required
                  min="-1"
                  defaultValue="-1"
                  placeholder="-1 for unlimited"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum tickets one user can buy (-1 = unlimited)
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  required
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
