import type { Metadata } from "next";
import WeeklyRaffleContent from "./WeeklyRaffleContent";

export const metadata: Metadata = {
  title: "Weekly Raffle",
  description: "This week's raffle requirements, entrants, and past winners.",
  alternates: { canonical: "/weekly-raffle" },
};

export default function Page() {
  return <WeeklyRaffleContent />;
}
