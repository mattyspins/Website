"use client";

import { useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";

const TIERS = [
  { id: 1, name: "Rookie",       wagerRequired: 10_000,    reward: 25   },
  { id: 2, name: "Hustler",      wagerRequired: 25_000,    reward: 50   },
  { id: 3, name: "Grinder",      wagerRequired: 50_000,    reward: 100  },
  { id: 4, name: "High Roller",  wagerRequired: 100_000,   reward: 150  },
  { id: 5, name: "VIP",          wagerRequired: 250_000,   reward: 250  },
  { id: 6, name: "Elite",        wagerRequired: 500_000,   reward: 500  },
  { id: 7, name: "Diamond",      wagerRequired: 700_000,   reward: 750  },
  { id: 8, name: "Legend",       wagerRequired: 1_300_000, reward: 1000 },
];

export default function AdminMilestones() {
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [currentWager, setCurrentWager] = useState<number | null>(null);
  const [newWager, setNewWager] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setMsg(null);
    setUserId("");
    setUserName("");
    setCurrentWager(null);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_ENDPOINTS.ADMIN_USERS_SEARCH}?query=${encodeURIComponent(search)}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const user = data.data?.users?.[0] || data.data?.[0];
      if (!user) {
        setMsg({ type: "error", text: "User not found." });
      } else {
        setUserId(user.id);
        setUserName(user.displayName);
        setCurrentWager(Number(user.totalWagered ?? 0));
        setNewWager(String(Number(user.totalWagered ?? 0)));
      }
    } catch {
      setMsg({ type: "error", text: "Search failed." });
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!userId || newWager === "") return;
    setSaving(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(API_ENDPOINTS.ADMIN_USER_WAGER(userId), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ totalWagered: parseFloat(newWager) }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentWager(Number(data.user.totalWagered));
        setMsg({ type: "success", text: `Updated ${userName}'s wager to $${parseFloat(newWager).toLocaleString()}` });
      } else {
        setMsg({ type: "error", text: data.error || "Update failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to update wager." });
    } finally {
      setSaving(false);
    }
  };

  const unlockedCount = currentWager !== null
    ? TIERS.filter((t) => currentWager >= t.wagerRequired).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Wager Milestone Management</h2>
        <p className="text-gray-500 text-sm mb-6">
          Search a user and update their total AceBet wagered amount to unlock milestones.
        </p>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by Discord username or ID..."
            className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold-500/30"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {/* User found */}
        {userId && (
          <div className="bg-navy-900/60 border border-white/6 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-white font-semibold">{userName}</p>
                <p className="text-gray-500 text-xs">{userId}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Current wager</p>
                <p className="text-gold-400 font-bold">${(currentWager ?? 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Milestone progress */}
            <div className="grid grid-cols-4 gap-2">
              {TIERS.map((t) => {
                const unlocked = (currentWager ?? 0) >= t.wagerRequired;
                return (
                  <div
                    key={t.id}
                    className={`rounded-lg px-2 py-1.5 text-center text-xs font-medium border ${
                      unlocked
                        ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                        : "bg-white/3 border-white/5 text-gray-600"
                    }`}
                  >
                    {t.name}
                    <div className="font-bold">${t.reward}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-gray-500 text-xs">{unlockedCount} / {TIERS.length} milestones unlocked</p>

            {/* Update wager */}
            <div className="flex gap-3 pt-2">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">New Total Wagered (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newWager}
                  onChange={(e) => setNewWager(e.target.value)}
                  className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="self-end bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        )}

        {msg && (
          <p className={`mt-3 text-sm ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Tier reference table */}
      <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Milestone Tiers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/5">
                <th className="text-left py-2 pr-4">Tier</th>
                <th className="text-left py-2 pr-4">Wager Required</th>
                <th className="text-left py-2">Cash Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {TIERS.map((t) => (
                <tr key={t.id} className="text-gray-300">
                  <td className="py-2.5 pr-4 font-medium">{t.name}</td>
                  <td className="py-2.5 pr-4">${t.wagerRequired.toLocaleString()}</td>
                  <td className="py-2.5 text-gold-400 font-semibold">${t.reward}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
