import type { Metadata } from "next";
import RewardsContent from "./RewardsContent";

export const metadata: Metadata = {
  title: "Rewards",
  description: "Milestones, daily check-ins, and every way to earn rewards on MattySpins.",
  alternates: { canonical: "/rewards" },
};

export default function Page() {
  return <RewardsContent />;
}
