import type { Metadata } from "next";
import LeaderboardContent from "./LeaderboardContent";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live wager race standings for MattySpins — see who's on top and when the next payout lands.",
  alternates: { canonical: "/leaderboard" },
};

export default function Page() {
  return <LeaderboardContent />;
}
