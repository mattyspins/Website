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

  const token = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const startSession = async () => {
    const t = token();
    if (!t || sessionActive.current) return;
    try {
      const res = await fetch(API_ENDPOINTS.VIEWING_SESSION_START, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
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
    const t = token();
    if (!t) return;
    try {
      await fetch(API_ENDPOINTS.VIEWING_SESSION_END, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ streamId: STREAM_ID }),
      });
    } catch { /* ignore */ }
  };

  const sendHeartbeat = async () => {
    const t = token();
    if (!t) return;
    try {
      await fetch(API_ENDPOINTS.VIEWING_SESSION_HEARTBEAT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ streamId: STREAM_ID }),
      });
    } catch { /* ignore */ }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.VIEWING_STREAM_STATUS);
      const d = await res.json();
      const live: boolean = d?.data?.isLive ?? false;
      setIsLive(live);
      if (live && token()) {
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
