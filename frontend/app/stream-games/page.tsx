import type { Metadata } from "next";
import StreamGamesContent from "./StreamGamesContent";

export const metadata: Metadata = {
  title: "Stream Games",
  description: "Every interactive stream game on MattySpins — Boss Raid, Bounty Hunter, King of the Hill, Slot World Cup, and more.",
  alternates: { canonical: "/stream-games" },
};

export default function Page() {
  return <StreamGamesContent />;
}
