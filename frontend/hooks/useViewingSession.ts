"use client";

import { useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000;  // every 5 min
const STATUS_POLL_INTERVAL = 60 * 1000;     // check live status every 60s
const STREAM_ID = "mattyspinsslots";

export function useViewingSession() {
  const [isLive, setIsLive] = useState(false);
  const sessionActive = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = async () => {
    if (sessionActive.current) return;
    try {
      const res = await fetch(API_ENDPOINTS.VIEWING_SESSION_START, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: STREAM_ID }),
      });
      if (res.ok) {
        sessionActive.current = true;
        heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      }
    } catch { /* ignore */ }
  };

  const endSession = async () => {
    if (!sessionActive.current) return;
    sessionActive.current = false;
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    try {
      await fetch(API_ENDPOINTS.VIEWING_SESSION_END, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: STREAM_ID }),
      });
    } catch { /* ignore */ }
  };

  const sendHeartbeat = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.VIEWING_SESSION_HEARTBEAT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: STREAM_ID }),
      });
      // Backend detected stream went offline — stop tracking immediately
      if (res.ok) {
        const data = await res.json();
        if (data.streamOffline) {
          sessionActive.current = false;
          if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
          setIsLive(false);
        }
      }
    } catch { /* ignore */ }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.VIEWING_STREAM_STATUS);
      const d = await res.json();
      const live: boolean = d?.data?.isLive ?? false;
      setIsLive(live);
      if (live) {
        if (!sessionActive.current) startSession();
      } else {
        if (sessionActive.current) endSession();
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    checkStatus();
    statusRef.current = setInterval(checkStatus, STATUS_POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkStatus();
      else if (sessionActive.current) endSession();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (statusRef.current) clearInterval(statusRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      endSession();
    };
  }, []);

  return { isLive };
}
