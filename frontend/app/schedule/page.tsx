import type { Metadata } from "next";
import ScheduleContent from "./ScheduleContent";
import { API_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Stream Schedule",
  description: "See when MattySpins is live next and what's coming up.",
  alternates: { canonical: "/schedule" },
};

interface StreamEvent {
  id: string;
  title: string;
  scheduledAt: string;
  gameType?: string;
  description?: string;
  isLive: boolean;
}

/** Public GET, no auth — safe to seed for every visitor including crawlers. */
async function getInitialEvents(): Promise<StreamEvent[] | undefined> {
  try {
    const res = await fetch(`${API_URL}/api/stream-events`, { cache: "no-store" });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.success ? data.events : undefined;
  } catch {
    return undefined;
  }
}

export default async function Page() {
  const initialEvents = await getInitialEvents();
  return <ScheduleContent initialEvents={initialEvents} />;
}
