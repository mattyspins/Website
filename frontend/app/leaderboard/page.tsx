"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

export default function LeaderboardsPage() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        // Try active first, then fall back to most-recently-ended
        const activeRes = await fetch(API_ENDPOINTS.LEADERBOARDS_ACTIVE);
        if (activeRes.ok) {
          const data = await activeRes.json();
          if (data.leaderboards?.length > 0) {
            router.replace(`/leaderboard/${data.leaderboards[0].id}`);
            return;
          }
        }
        const endedRes = await fetch(API_ENDPOINTS.LEADERBOARDS_COMPLETED);
        if (endedRes.ok) {
          const data = await endedRes.json();
          if (data.leaderboards?.length > 0) {
            router.replace(`/leaderboard/${data.leaderboards[0].id}`);
            return;
          }
        }
      } catch { /* ignore */ }
    };
    redirect();
  }, [router]);

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="text-center">
        <Trophy className="w-10 h-10 text-gold-400 mx-auto mb-3 animate-pulse" />
        <p className="text-gray-400 text-sm">Loading leaderboard…</p>
      </div>
    </div>
  );
}
