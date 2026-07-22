import type { Metadata } from "next";
import MilestonesContent from "./MilestonesContent";

export const metadata: Metadata = {
  title: "Milestones",
  description: "Track your progress and claim milestone rewards on MattySpins.",
  alternates: { canonical: "/milestones" },
};

export default function Page() {
  return <MilestonesContent />;
}
