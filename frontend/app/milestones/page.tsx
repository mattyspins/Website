import type { Metadata } from "next";
import MilestonesContent from "./MilestonesContent";
import { API_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Milestones",
  description: "Track your progress and claim milestone rewards on MattySpins.",
  alternates: { canonical: "/milestones" },
};

interface MilestoneTier {
  id: number;
  name: string;
  wagerRequired: number;
  reward: number;
  unlocked: boolean;
  claimStatus: "pending" | "approved" | "rejected" | null;
}

/**
 * /api/milestones is public and personalizes only if a Bearer token is sent —
 * the server has no access to the browser's localStorage token, so this
 * deliberately fetches anonymously and gets back every tier locked, which is
 * the correct seed for an unidentified visitor/crawler. The client remains
 * responsible for re-fetching with the real token to show actual progress.
 */
async function getInitialData(): Promise<{ tiers: MilestoneTier[]; totalWagered: number } | undefined> {
  try {
    const res = await fetch(`${API_URL}/api/milestones`, { cache: "no-store" });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (!data.success) return undefined;
    return { tiers: data.tiers ?? [], totalWagered: Number(data.totalWagered) || 0 };
  } catch {
    return undefined;
  }
}

export default async function Page() {
  const initialData = await getInitialData();
  return <MilestonesContent initialData={initialData} />;
}
