"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { API_ENDPOINTS } from "@/lib/api";
import { Search, ArrowRight, Star, UserCheck } from "lucide-react";

interface User {
  id: string;
  discordId: string;
  displayName: string;
  kickUsername?: string;
  kickVerified?: boolean;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  isSuspended: boolean;
  isVip: boolean;
  isDepositor: boolean;
}

type SortOrder = "az" | "za";
type RoleFilter = "all" | "vip" | "depositor" | "moderator" | "suspended";

export default function AdminUsers() {
  const router = useRouter();
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (query = "") => {
    setLoading(true);
    try {
      const url = query
        ? `${API_ENDPOINTS.ADMIN_USERS_SEARCH}?query=${encodeURIComponent(query)}`
        : API_ENDPOINTS.ADMIN_USERS_SEARCH;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.users ?? []);
      } else {
        setUsers([]);
        error("Failed to load", "Could not fetch users.");
      }
    } catch {
      setUsers([]);
      error("Error", "Network error while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (
    user: User,
    field: "isVip" | "isDepositor" | "isModerator"
  ) => {
    const endpoint =
      field === "isModerator"
        ? API_ENDPOINTS.ADMIN_USER_MODERATOR(user.id)
        : field === "isVip"
        ? API_ENDPOINTS.ADMIN_USER_VIP(user.id)
        : API_ENDPOINTS.ADMIN_USER_DEPOSITOR(user.id);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !user[field] }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, [field]: !user[field] } : u))
        );
        const label =
          field === "isVip" ? "VIP" : field === "isDepositor" ? "Depositor" : "Moderator";
        success("Role updated", `${user.displayName} — ${label} ${!user[field] ? "granted" : "removed"}.`);
      } else {
        error("Failed", "Could not update role.");
      }
    } catch {
      error("Error", "Network error.");
    }
  };

  const filtered = [...users]
    .filter((u) => {
      if (roleFilter === "vip") return u.isVip;
      if (roleFilter === "depositor") return u.isDepositor;
      if (roleFilter === "moderator") return u.isModerator;
      if (roleFilter === "suspended") return u.isSuspended;
      return true;
    })
    .sort((a, b) =>
      sortOrder === "az"
        ? a.displayName.localeCompare(b.displayName)
        : b.displayName.localeCompare(a.displayName)
    );

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="bg-navy-800/60 border border-white/6 rounded-xl p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadUsers(searchQuery);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, Kick or Discord ID…"
              className="w-full pl-9 pr-4 py-2.5 bg-navy-900/60 border border-white/8 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/40"
            />
          </div>
          <button
            type="submit"
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              loadUsers();
            }}
            className="bg-white/6 hover:bg-white/10 text-gray-300 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Filters + sort row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "vip", "depositor", "moderator", "suspended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors border ${
                roleFilter === f
                  ? "bg-yellow-600 border-yellow-500 text-white"
                  : "bg-white/3 border-white/8 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "depositor"
                ? "Depositors"
                : f === "moderator"
                ? "Moderators"
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-gray-500 text-xs">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex rounded-lg overflow-hidden border border-white/8 text-xs font-semibold">
            <button
              onClick={() => setSortOrder("az")}
              className={`px-3 py-1.5 transition-colors ${
                sortOrder === "az" ? "bg-yellow-600 text-white" : "bg-white/3 text-gray-400 hover:text-white"
              }`}
            >
              A → Z
            </button>
            <button
              onClick={() => setSortOrder("za")}
              className={`px-3 py-1.5 transition-colors ${
                sortOrder === "za" ? "bg-yellow-600 text-white" : "bg-white/3 text-gray-400 hover:text-white"
              }`}
            >
              Z → A
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-navy-800/60 border border-white/6 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-semibold">No users found</p>
            {searchQuery && (
              <p className="text-gray-600 text-sm mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-widest py-3 px-4">
                    User
                  </th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-widest py-3 px-4">
                    Coins
                  </th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-widest py-3 px-4">
                    Status
                  </th>
                  <th className="text-right text-gray-500 text-xs font-semibold uppercase tracking-widest py-3 px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
                  >
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <p className="text-white font-semibold text-sm leading-tight">
                        {user.displayName}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">{user.discordId}</p>
                    </td>

                    {/* Coins */}
                    <td className="py-3.5 px-4">
                      <span className="text-yellow-300 font-bold text-sm">
                        {user.points.toLocaleString()}
                      </span>
                    </td>

                    {/* Status badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.isAdmin && (
                          <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black">
                            ADMIN
                          </span>
                        )}
                        {user.isModerator && (
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            MOD
                          </span>
                        )}
                        {user.isVip && (
                          <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            VIP
                          </span>
                        )}
                        {user.isDepositor && (
                          <span className="bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            DEP
                          </span>
                        )}
                        {user.isSuspended && (
                          <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            SUSPENDED
                          </span>
                        )}
                        {!user.isAdmin &&
                          !user.isModerator &&
                          !user.isVip &&
                          !user.isDepositor &&
                          !user.isSuspended && (
                            <span className="text-gray-700 text-xs">—</span>
                          )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {!user.isAdmin && (
                          <>
                            <button
                              onClick={() => toggleRole(user, "isVip")}
                              title={user.isVip ? "Remove VIP" : "Grant VIP"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.isVip
                                  ? "bg-yellow-500/25 text-yellow-300 hover:bg-yellow-500/40"
                                  : "bg-white/4 text-gray-600 hover:text-yellow-300 hover:bg-yellow-500/15"
                              }`}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleRole(user, "isDepositor")}
                              title={user.isDepositor ? "Remove Depositor" : "Grant Depositor"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.isDepositor
                                  ? "bg-green-500/25 text-green-300 hover:bg-green-500/40"
                                  : "bg-white/4 text-gray-600 hover:text-green-300 hover:bg-green-500/15"
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="flex items-center gap-1 bg-white/6 hover:bg-white/12 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Manage <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
