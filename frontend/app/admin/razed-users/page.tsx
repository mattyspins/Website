"use client";

import { useEffect, useState } from "react";
import { wagerLeaderboardApi, AllWagererRow, WagererTotals } from "@/lib/api/wagerLeaderboard";

const TOTAL_TILES: { key: keyof WagererTotals; label: string }[] = [
  { key: "today", label: "Wagered Today" },
  { key: "weekly", label: "Wagered This Week" },
  { key: "monthly", label: "Wagered This Month" },
  { key: "allTime", label: "Wagered All-Time" },
];

export default function AdminRazedUsersPage() {
  const [wagerers, setWagerers] = useState<AllWagererRow[]>([]);
  const [totals, setTotals] = useState<WagererTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    wagerLeaderboardApi
      .getAllWagerers()
      .then(setWagerers)
      .catch(() => setWagerers([]))
      .finally(() => setLoading(false));
    wagerLeaderboardApi.getWagerTotals().then(setTotals).catch(() => setTotals(null));
  }, []);

  const filtered = search.trim()
    ? wagerers.filter((w) => {
        const q = search.trim().toLowerCase();
        return (
          w.razedUsername.toLowerCase().includes(q) ||
          w.displayName?.toLowerCase().includes(q) ||
          w.kickUsername?.toLowerCase().includes(q)
        );
      })
    : wagerers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white tracking-wide">Razed Users</h1>
        <p className="text-gray-400 text-sm mt-0.5">Every player wagering under our Razed referral code, linked to a site account or not</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TOTAL_TILES.map((tile) => (
          <div key={tile.key} className="bg-navy-800/60 border border-white/6 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tile.label}</p>
            <p className="text-2xl font-bold text-white mt-1.5">
              {totals ? `$${Number(totals[tile.key]).toLocaleString()}` : "—"}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              All Wagerers ({filtered.length}{filtered.length !== wagerers.length ? ` of ${wagerers.length}` : ""})
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username…"
              className="bg-navy-900/60 border border-white/8 rounded-lg px-3 py-1.5 text-white text-sm w-56 focus:outline-none focus:border-gold-500/30 placeholder:text-gray-400"
            />
          </div>
          <div className="bg-navy-800/60 border border-white/6 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy-800 text-gray-400 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Razed Username</th>
                    <th className="text-left font-semibold px-4 py-2.5">Site Account</th>
                    <th className="text-right font-semibold px-4 py-2.5">Weekly</th>
                    <th className="text-right font-semibold px-4 py-2.5">Monthly</th>
                    <th className="text-right font-semibold px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        {wagerers.length === 0 ? "No wagerers under our code yet." : `No wagerers match "${search}"`}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((w) => (
                      <tr key={w.razedUsername} className="border-t border-white/4 hover:bg-white/3">
                        <td className="px-4 py-2.5 text-gray-300">{w.razedUsername}</td>
                        <td className="px-4 py-2.5">
                          {w.linked ? (
                            <a href={`/admin/users/${w.userId}`} className="text-gold-400 hover:underline">
                              {w.kickUsername ?? w.displayName}
                              {!w.verified && <span className="text-yellow-400 text-[10px] font-bold ml-1.5">PENDING</span>}
                            </a>
                          ) : (
                            <span className="text-gray-400">Not linked</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-300">${Number(w.weeklyWagered).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-gray-300">${Number(w.monthlyWagered).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-white font-semibold">${Number(w.totalWagered).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
