import type { Metadata } from "next";
import ScheduleContent from "./ScheduleContent";

export const metadata: Metadata = {
  title: "Stream Schedule",
  description: "See when MattySpins is live next and what's coming up.",
  alternates: { canonical: "/schedule" },
};

export default function Page() {
  return <ScheduleContent />;
}
