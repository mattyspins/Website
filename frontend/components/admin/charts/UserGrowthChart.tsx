"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { API_ENDPOINTS } from "@/lib/api";

interface Point {
  date: string;
  newUsers: number;
  totalUsers: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function UserGrowthChart() {
  const [data, setData] = useState<Point[] | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_ENDPOINTS.ADMIN_GROWTH}?days=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .catch(() => setData([]));
  }, []);

  return (
    <div className="bg-navy-800/60 border border-white/6 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-1">User Growth</h3>
      <p className="text-gray-500 text-xs mb-4">New signups &amp; total users, last 30 days</p>
      {!data ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="totalUsersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#facc15" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{ background: "#0f1629", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Area type="monotone" dataKey="totalUsers" name="Total Users" stroke="#facc15" fill="url(#totalUsersFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
