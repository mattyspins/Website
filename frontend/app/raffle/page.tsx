"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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

interface UserTickets {
  [raffleId: string]: number;
}

export default function RafflePage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [userTickets, setUserTickets] = useState<UserTickets>({});
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    loadRaffles();
    loadUserInfo();
  }, []);

  const loadRaffles = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/raffles/active");

      if (response.ok) {
        const data = await response.json();
        const raffleList = data.data.raffles || [];
        setRaffles(raffleList);

        // Load user tickets for each raffle
        const accessToken = localStorage.getItem("access_token");
        if (accessToken) {
          const ticketCounts: UserTickets = {};
          for (const raffle of raffleList) {
            const ticketsResponse = await fetch(
              `http://localhost:3001/api/raffles/${raffle.id}/tickets`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              },
            );
            if (ticketsResponse.ok) {
              const ticketsData = await ticketsResponse.json();
              ticketCounts[raffle.id] = ticketsData.data.tickets?.length || 0;
            }
          }
          setUserTickets(ticketCounts);
        }
      }
    } catch (error) {
      console.error("Failed to load raffles:", error);
    }
    setLoading(false);
  };

  const loadUserInfo = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch("http://localhost:3001/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPoints(data.user.points || 0);
      }
    } catch (error) {
      console.error("Failed to load user info:", error);
    }
  };

  const calculateMaxAffordable = (raffle: Raffle) => {
    const affordableByPoints = Math.floor(userPoints / raffle.ticketPrice);
    const availableTickets = raffle.maxTickets - raffle.ticketsSold;
    const userCurrentTickets = userTickets[raffle.id] || 0;

    let maxPurchase = Math.min(affordableByPoints, availableTickets);

    // Apply per-user limit if set
    if (raffle.maxEntriesPerUser !== -1) {
      const remainingEntries = raffle.maxEntriesPerUser - userCurrentTickets;
      maxPurchase = Math.min(maxPurchase, remainingEntries);
    }

    return Math.max(0, maxPurchase);
  };

  const openPurchaseModal = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setQuantity(1);
    setShowPurchaseModal(true);
  };

  const buyMax = () => {
    if (selectedRaffle) {
      const max = calculateMaxAffordable(selectedRaffle);
      setQuantity(max);
    }
  };

  const purchaseTickets = async () => {
    if (!selectedRaffle) return;

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      alert("Please login first");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/raffles/${selectedRaffle.id}/purchase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ quantity }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        alert(
          `Successfully purchased ${quantity} ticket(s)!\n\nYour tickets: ${data.data.tickets.map((t: any) => `#${t.ticketNumber}`).join(", ")}\n\nRemaining balance: ${data.data.remainingBalance} points`,
        );
        setShowPurchaseModal(false);
        loadRaffles();
        loadUserInfo();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Failed to purchase tickets");
      }
    } catch (error) {
      console.error("Failed to purchase tickets:", error);
      alert("Failed to purchase tickets");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎟️ Active Raffles
          </h1>
          <p className="text-gray-300 text-lg">
            Buy tickets with your points for a chance to win amazing prizes!
          </p>
          <div className="mt-4 inline-block bg-purple-600/30 border border-purple-500/50 rounded-lg px-6 py-3">
            <span className="text-purple-300 text-sm">Your Points: </span>
            <span className="text-white font-bold text-xl">
              {userPoints.toLocaleString()} 💎
            </span>
          </div>
        </div>

        {/* Raffles Grid */}
        {raffles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">
              No active raffles at the moment. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {raffles.map((raffle) => {
              const userTicketCount = userTickets[raffle.id] || 0;
              const maxAffordable = calculateMaxAffordable(raffle);
              const canPurchase = maxAffordable > 0;

              return (
                <motion.div
                  key={raffle.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6 flex flex-col"
                >
                  {/* Prize */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {raffle.title}
                    </h3>
                    {raffle.description && (
                      <p className="text-gray-400 text-sm mb-3">
                        {raffle.description}
                      </p>
                    )}
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3">
                      <p className="text-yellow-400 font-semibold text-lg">
                        🎁 {raffle.prize}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ticket Price:</span>
                      <span className="text-purple-400 font-semibold">
                        {raffle.ticketPrice} points
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Winners:</span>
                      <span className="text-yellow-400 font-semibold">
                        {raffle.numberOfWinners}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Your Tickets:</span>
                      <span className="text-green-400 font-semibold">
                        {userTicketCount}
                        {raffle.maxEntriesPerUser !== -1 &&
                          ` / ${raffle.maxEntriesPerUser}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tickets Sold:</span>
                      <span className="text-white font-semibold">
                        {raffle.ticketsSold} / {raffle.maxTickets}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-black/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(raffle.ticketsSold / raffle.maxTickets) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* End Date */}
                  <p className="text-gray-500 text-xs mb-4">
                    Ends: {new Date(raffle.endsAt).toLocaleString()}
                  </p>

                  {/* Buy Button */}
                  <button
                    onClick={() => openPurchaseModal(raffle)}
                    disabled={!canPurchase}
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                      canPurchase
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {canPurchase
                      ? "🎟️ Buy Tickets"
                      : userTicketCount >= raffle.maxEntriesPerUser &&
                          raffle.maxEntriesPerUser !== -1
                        ? "Max Entries Reached"
                        : "Sold Out / Insufficient Points"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && selectedRaffle && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">
                Buy Raffle Tickets
              </h3>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                <p className="text-white font-semibold text-lg mb-2">
                  {selectedRaffle.title}
                </p>
                <p className="text-yellow-400">🎁 {selectedRaffle.prize}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Number of Tickets
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(
                            1,
                            Math.min(
                              parseInt(e.target.value) || 1,
                              calculateMaxAffordable(selectedRaffle),
                            ),
                          ),
                        )
                      }
                      min="1"
                      max={calculateMaxAffordable(selectedRaffle)}
                      className="flex-1 px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={buyMax}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                    >
                      Buy Max
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Max you can buy: {calculateMaxAffordable(selectedRaffle)}
                  </p>
                </div>

                <div className="bg-black/50 border border-purple-500/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price per ticket:</span>
                    <span className="text-purple-400 font-semibold">
                      {selectedRaffle.ticketPrice} points
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Quantity:</span>
                    <span className="text-white font-semibold">{quantity}</span>
                  </div>
                  <div className="border-t border-purple-500/30 pt-2 flex justify-between">
                    <span className="text-white font-semibold">
                      Total Cost:
                    </span>
                    <span className="text-purple-400 font-bold text-lg">
                      {(selectedRaffle.ticketPrice * quantity).toLocaleString()}{" "}
                      points
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Remaining balance:</span>
                    <span className="text-green-400 font-semibold">
                      {(
                        userPoints -
                        selectedRaffle.ticketPrice * quantity
                      ).toLocaleString()}{" "}
                      points
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={purchaseTickets}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all"
                  >
                    Purchase
                  </button>
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Cancel
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
