"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Leaderboard {
  id: string;
  title: string;
  description?: string;
  prizePool: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface Prize {
  position: number;
  prizeAmount: string;
  prizeDescription?: string;
}

export default function AdminLeaderboardsPage() {
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prizePool: "",
    startDate: "",
    endDate: "",
  });
  const [prizes, setPrizes] = useState<Prize[]>([
    { position: 1, prizeAmount: "", prizeDescription: "" },
  ]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const response = await api.get("/api/manual-leaderboards?limit=20");
      console.log("Leaderboards response:", response);
      if (response.success) {
        setLeaderboards(response.leaderboards);
      }
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeaderboard = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log("Creating leaderboard with data:", {
        ...formData,
        prizes: prizes.filter((p) => p.prizeAmount.trim() !== ""),
      });

      const response = await api.post("/api/manual-leaderboards/admin/create", {
        ...formData,
        prizes: prizes.filter((p) => p.prizeAmount.trim() !== ""),
      });

      console.log("Create leaderboard response:", response);

      if (response.success) {
        alert("Leaderboard created successfully!");
        setShowCreateForm(false);
        setFormData({
          title: "",
          description: "",
          prizePool: "",
          startDate: "",
          endDate: "",
        });
        setPrizes([{ position: 1, prizeAmount: "", prizeDescription: "" }]);
        fetchLeaderboards();
      } else {
        alert(`Error: ${response.error || "Failed to create leaderboard"}`);
      }
    } catch (error: any) {
      console.error("Create leaderboard error:", error);
      alert(
        `Error: ${error.response?.data?.error || error.message || "Failed to create leaderboard"}`,
      );
    }
  };

  const addPrizeField = () => {
    setPrizes([
      ...prizes,
      { position: prizes.length + 1, prizeAmount: "", prizeDescription: "" },
    ]);
  };

  const removePrizeField = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  const updatePrize = (
    index: number,
    field: keyof Prize,
    value: string | number,
  ) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], [field]: value };
    setPrizes(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDeleteLeaderboard = async (leaderboardId: string) => {
    try {
      const response = await api.delete(
        `/api/manual-leaderboards/admin/${leaderboardId}`,
      );

      if (response.success) {
        alert("Leaderboard deleted successfully!");
        setDeleteConfirm(null);
        fetchLeaderboards(); // Refresh the list
      } else {
        alert(`Error: ${response.error || "Failed to delete leaderboard"}`);
      }
    } catch (error: any) {
      console.error("Delete leaderboard error:", error);
      alert(
        `Error: ${error.response?.data?.error || error.message || "Failed to delete leaderboard"}`,
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading leaderboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Manual Leaderboards</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition"
          >
            {showCreateForm ? "Cancel" : "Create New Leaderboard"}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Create New Leaderboard</h2>
            <form onSubmit={handleCreateLeaderboard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., Weekly Gambling Leaderboard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Prize Pool *
                </label>
                <input
                  type="text"
                  required
                  value={formData.prizePool}
                  onChange={(e) =>
                    setFormData({ ...formData, prizePool: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., $500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Prize Distribution
                  </label>
                  <button
                    type="button"
                    onClick={addPrizeField}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    + Add Prize
                  </button>
                </div>
                {prizes.map((prize, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={prize.position}
                      onChange={(e) =>
                        updatePrize(index, "position", parseInt(e.target.value))
                      }
                      className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      placeholder="Pos"
                    />
                    <input
                      type="text"
                      value={prize.prizeAmount}
                      onChange={(e) =>
                        updatePrize(index, "prizeAmount", e.target.value)
                      }
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="Prize amount (e.g., $100)"
                    />
                    <input
                      type="text"
                      value={prize.prizeDescription || ""}
                      onChange={(e) =>
                        updatePrize(index, "prizeDescription", e.target.value)
                      }
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="Description (optional)"
                    />
                    {prizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrizeField(index)}
                        className="text-red-400 hover:text-red-300 px-3"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Create Leaderboard
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4 mt-5">
          {leaderboards.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                No leaderboards found. Create one to get started!
              </p>
            </div>
          ) : (
            leaderboards.map((lb) => (
              <div
                key={lb.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{lb.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lb.status)}`}
                      >
                        {lb.status.toUpperCase()}
                      </span>
                    </div>
                    {lb.description && (
                      <p className="text-gray-400 mb-3">{lb.description}</p>
                    )}
                    <div className="flex gap-6 text-sm text-gray-400">
                      <div>
                        <span className="font-semibold text-purple-400">
                          Prize Pool:
                        </span>{" "}
                        {lb.prizePool}
                      </div>
                      <div>
                        <span className="font-semibold text-purple-400">
                          Start:
                        </span>{" "}
                        {new Date(lb.startDate).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-semibold text-purple-400">
                          End:
                        </span>{" "}
                        {new Date(lb.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/admin/leaderboards/${lb.id}`}
                      className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Manage
                    </a>
                    <a
                      href={`/leaderboard/${lb.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      View
                    </a>
                    <button
                      onClick={() => setDeleteConfirm(lb.id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-red-400">
                Confirm Delete
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this leaderboard? This action
                cannot be undone and will remove all associated wagers and
                prizes.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDeleteLeaderboard(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition flex-1"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
