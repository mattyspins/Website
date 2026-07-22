"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { API_ENDPOINTS } from "@/lib/api";
import { Star, UserCheck, ArrowRight, Coins } from "lucide-react";
import UsersFilters, { UserFilterState } from "./UsersFilters";
import UsersBulkActions from "./UsersBulkActions";
import UsersExportButton from "./UsersExportButton";
import AdjustPointsModal from "./AdjustPointsModal";

interface User {
  id: string;
  discordId: string;
  kickUsername?: string;
  kickVerified: boolean;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  displayName: string;
  avatar?: string;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  isVip: boolean;
  isDepositor: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastActive?: string;
}

const LIMIT = 25;

function accountType(u: User) {
  if (u.isAdmin) return { label: "Admin", cls: "bg-yellow-500 text-black" };
  if (u.isModerator) return { label: "Moderator", cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30" };
  if (u.isVip) return { label: "VIP", cls: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" };
  if (u.isDepositor) return { label: "Depositor", cls: "bg-green-500/20 text-green-300 border border-green-500/30" };
  return { label: "Member", cls: "bg-white/6 text-gray-400" };
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ user }: { user: User }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full shrink-0 ring-1 ring-white/10" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-white/60">
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

export default function UsersTable() {
  const router = useRouter();
  const { success, error } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ranks, setRanks] = useState<Map<string, number> | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<UserFilterState>({ role: "all", razed: "all", minPoints: "", maxPoints: "" });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adjustUser, setAdjustUser] = useState<User | null>(null);

  const token = () => localStorage.getItem("access_token") ?? "";
  const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.role === "admin") params.set("isAdmin", "true");
    if (filters.role === "moderator") params.set("isModerator", "true");
    if (filters.role === "vip") params.set("isVip", "true");
    if (filters.role === "depositor") params.set("isDepositor", "true");
    if (filters.role === "suspended") params.set("isSuspended", "true");
    if (filters.razed === "verified") params.set("rainbetVerified", "true");
    if (filters.razed === "unverified") params.set("rainbetVerified", "false");
    if (filters.minPoints) params.set("minPoints", filters.minPoints);
    if (filters.maxPoints) params.set("maxPoints", filters.maxPoints);
    return params;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams();
      params.set("limit", String(LIMIT));
      params.set("offset", String(offset));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (query) params.set("query", query);

      const res = await fetch(`${API_ENDPOINTS.ADMIN_USERS_SEARCH}?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.users ?? []);
        setTotal(data.data?.pagination?.total ?? 0);
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
  }, [buildFilterParams, offset, sortBy, sortOrder, query]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(API_ENDPOINTS.ADMIN_USERS_RANKS, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRanks(new Map(d.data.ranks.map((r: { id: string; rank: number }) => [r.id, r.rank])));
        }
      })
      .catch(() => setRanks(new Map()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRole = async (user: User, field: "isVip" | "isDepositor") => {
    const endpoint = field === "isVip" ? API_ENDPOINTS.ADMIN_USER_VIP(user.id) : API_ENDPOINTS.ADMIN_USER_DEPOSITOR(user.id);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: authHeaders(), body: JSON.stringify({ [field]: !user[field] }) });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, [field]: !user[field] } : u)));
        success("Role updated", `${user.displayName} — ${field === "isVip" ? "VIP" : "Depositor"} ${!user[field] ? "granted" : "removed"}.`);
      } else {
        error("Failed", "Could not update role.");
      }
    } catch {
      error("Error", "Network error.");
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === users.length ? new Set() : new Set(users.map((u) => u.id))));
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const page = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="space-y-4">
      <UsersFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => { setQuery(searchInput); setOffset(0); }}
        filters={filters}
        onFiltersChange={(f) => { setFilters(f); setOffset(0); }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(sb, so) => { setSortBy(sb); setSortOrder(so); setOffset(0); }}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-gray-400 text-xs">
          {total.toLocaleString()} user{total !== 1 ? "s" : ""}
        </p>
        <UsersExportButton query={query} params={buildFilterParams()} />
      </div>

      <UsersBulkActions
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        onDone={load}
      />

      <div className="bg-navy-800/60 border border-white/6 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-semibold">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="w-10 py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === users.length}
                      onChange={toggleSelectAll}
                      className="accent-gold-500"
                    />
                  </th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">User</th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Rank</th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Coins</th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Account Type</th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Razed</th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Joined</th>
                  <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Last Active</th>
                  <th className="text-right text-gray-400 text-xs font-semibold uppercase tracking-widest py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const type = accountType(user);
                  return (
                    <tr key={user.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelected(user.id)}
                          className="accent-gold-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar user={user} />
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm leading-tight truncate">{user.displayName}</p>
                            {user.isSuspended && (
                              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                SUSPENDED
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-sm">
                        {ranks?.has(user.id) ? `#${ranks.get(user.id)}` : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-gold-300 font-bold text-sm">{user.points.toLocaleString()}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${type.cls}`}>{type.label}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {user.rainbetUsername ? (
                          <span className={user.rainbetVerified ? "text-green-400" : "text-yellow-400"}>
                            {user.rainbetVerified ? "Verified" : "Pending"}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs">{fmtDate(user.createdAt)}</td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs">{fmtDate(user.lastActive)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {!user.isAdmin && (
                            <>
                              <button
                                onClick={() => toggleRole(user, "isVip")}
                                title={user.isVip ? "Remove VIP" : "Grant VIP"}
                                className={`p-1.5 rounded-lg transition-colors ${user.isVip ? "bg-yellow-500/25 text-yellow-300 hover:bg-yellow-500/40" : "bg-white/4 text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/15"}`}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleRole(user, "isDepositor")}
                                title={user.isDepositor ? "Remove Depositor" : "Grant Depositor"}
                                className={`p-1.5 rounded-lg transition-colors ${user.isDepositor ? "bg-green-500/25 text-green-300 hover:bg-green-500/40" : "bg-white/4 text-gray-400 hover:text-green-300 hover:bg-green-500/15"}`}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setAdjustUser(user)}
                            title="Adjust points"
                            className="p-1.5 rounded-lg bg-white/4 text-gray-400 hover:text-gold-300 hover:bg-gold-500/15 transition-colors"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="flex items-center gap-1 bg-white/6 hover:bg-white/12 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Manage <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            disabled={page === 1}
            className="px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
          >
            ← Previous
          </button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setOffset((o) => o + LIMIT)}
            disabled={page === totalPages}
            className="px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {adjustUser && (
        <AdjustPointsModal
          userIds={[adjustUser.id]}
          userLabel={adjustUser.displayName}
          onClose={() => setAdjustUser(null)}
          onSuccess={() => { setAdjustUser(null); load(); }}
        />
      )}
    </div>
  );
}
