"use client";

import { useViewingSession } from "@/hooks/useViewingSession";

export default function ViewingSessionTracker() {
  useViewingSession();
  return null;
}
