"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_ENDPOINTS } from "@/lib/api";

interface PointActivity {
  id: string;
  type: "points";
  user: { id: string; displayName: string; avatarUrl: string | null };
  admin: { id: string; displayName: string } | null;
  amount: number;
  transactionType: string;
  reason: string;
  createdAt: string;
}

interface StoreActivity {
  id: string;
  type: "store";
  user: { id: string; displayName: string; avatarUrl: string | null };
  itemName: string;
  quantity: number;
  totalPrice: number;
  createdAt: string;
}

type ActivityItem = PointActivity | StoreActivity;

function Avatar({ user }: { user: { displayName: string; avatarUrl: string | null } }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0 ring-1 ring-white/10" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-white/60">
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function formatTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_ENDPOINTS.ADMIN_ACTIVITY}?limit=8&type=all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setItems(d.data.items); })
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="bg-navy-800/60 border border-white/6 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
        <Link href="/admin/audit-logs" className="text-gold-400 hover:text-gold-300 text-xs font-medium transition-colors">
          View all
        </Link>
      </div>
      {!items ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No recent activity</div>
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar user={item.user} />
              <div className="min-w-0 flex-1">
                {item.type === "points" ? (
                  <p className="text-sm truncate">
                    <span className="text-white font-medium">{item.user.displayName}</span>{" "}
                    <span className="text-gray-500">
                      {item.amount > 0 ? "received" : "was charged"}{" "}
                    </span>
                    <span className={item.amount > 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                      {item.amount > 0 ? "+" : ""}{item.amount.toLocaleString()}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm truncate">
                    <span className="text-white font-medium">{item.user.displayName}</span>{" "}
                    <span className="text-gray-500">redeemed</span>{" "}
                    <span className="text-gold-400 font-semibold">{item.itemName}</span>
                  </p>
                )}
              </div>
              <time className="text-gray-600 text-xs shrink-0 tabular-nums">{formatTime(item.createdAt)}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
