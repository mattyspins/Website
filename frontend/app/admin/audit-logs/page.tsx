"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

type ActivityType = "all" | "points" | "store";

interface PointActivity {
  id: string;
  type: "points";
  user: { id: string; displayName: string; avatarUrl: string | null };
  admin: { id: string; displayName: string } | null;
  amount: number;
  transactionType: string;
  reason: string;
  referenceType: string | null;
  createdAt: string;
}

interface StoreActivity {
  id: string;
  type: "store";
  user: { id: string; displayName: string; avatarUrl: string | null };
  admin: null;
  itemName: string;
  itemCategory: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

type ActivityItem = PointActivity | StoreActivity;

const TYPE_TABS: { id: ActivityType; label: string; icon: string }[] = [
  { id: "all",    label: "All Activity", icon: "📋" },
  { id: "points", label: "Points",       icon: "🪙" },
  { id: "store",  label: "Store",        icon: "🛒" },
];

function Avatar({ user }: { user: { displayName: string; avatarUrl: string | null } }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0 ring-1 ring-white/10" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-sm font-bold text-white/60">
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function PointRow({ item }: { item: PointActivity }) {
  const isAdd = item.amount > 0;
  const isAdmin = item.transactionType === "admin_adjustment" || item.admin;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors group">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
        isAdd ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
      }`}>
        {isAdd ? "+" : "−"}
      </div>

      {/* User */}
      <Avatar user={item.user} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-medium text-sm">{item.user.displayName}</span>
          {isAdmin && item.admin && (
            <span className="text-white/30 text-xs">via <span className="text-white/50">{item.admin.displayName}</span></span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isAdd ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
          }`}>
            {isAdd ? "+" : ""}{item.amount.toLocaleString()} coins
          </span>
          {item.transactionType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 uppercase tracking-wide">
              {item.transactionType.replace(/_/g, " ")}
            </span>
          )}
        </div>
        {item.reason && (
          <p className="text-white/40 text-xs mt-0.5 truncate">{item.reason}</p>
        )}
      </div>

      {/* Time */}
      <time className="text-white/25 text-xs shrink-0 tabular-nums">
        {formatTime(item.createdAt)}
      </time>
    </div>
  );
}

function StoreRow({ item }: { item: StoreActivity }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors group">
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-yellow-500/15 text-yellow-400">
        🛒
      </div>

      {/* User */}
      <Avatar user={item.user} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-medium text-sm">{item.user.displayName}</span>
          <span className="text-white/30 text-xs">redeemed</span>
          <span className="text-yellow-300 text-sm font-semibold">{item.itemName}</span>
          {item.quantity > 1 && <span className="text-white/40 text-xs">×{item.quantity}</span>}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
            −{item.totalPrice.toLocaleString()} coins
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded bg-white/5 uppercase tracking-wide ${
            item.status === "completed" ? "text-green-400" : "text-white/30"
          }`}>
            {item.status}
          </span>
        </div>
        {item.itemCategory && (
          <p className="text-white/30 text-xs mt-0.5">{item.itemCategory}</p>
        )}
      </div>

      {/* Time */}
      <time className="text-white/25 text-xs shrink-0 tabular-nums">
        {formatTime(item.createdAt)}
      </time>
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ActivityPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<ActivityType>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    fetch(API_ENDPOINTS.AUTH_ME, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!d.user?.isAdmin) router.push("/"); else setAuthed(true); })
      .catch(() => router.push("/"));
  }, []);

  const load = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !authed) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50", type: typeFilter });
      if (search) params.set("search", search);
      const res = await fetch(`${API_ENDPOINTS.ADMIN_ACTIVITY}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [authed, page, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
    </div>
  );

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Log</h1>
            <p className="text-white/40 text-sm mt-0.5">
              Points added/removed · Store redemptions · {total.toLocaleString()} total records
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors text-sm"
          >
            ← Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Type tabs */}
          <div className="flex gap-1 bg-white/5 border border-white/8 rounded-lg p-1">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setTypeFilter(tab.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  typeFilter === tab.id
                    ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
              placeholder="Search by username…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-yellow-400/50 min-w-0"
            />
            <button
              onClick={() => { setSearch(searchInput); setPage(1); }}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 text-sm transition-colors"
            >
              Search
            </button>
            {search && (
              <button
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                className="px-3 py-1.5 border border-white/10 rounded-lg text-white/40 hover:bg-white/5 text-sm transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Feed */}
        <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <p className="text-3xl mb-2">📋</p>
              <p>No activity found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map(item =>
                item.type === "points"
                  ? <PointRow key={item.id} item={item} />
                  : <StoreRow key={item.id} item={item} />
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
            >
              ← Previous
            </button>
            <span className="text-white/40 text-sm">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
