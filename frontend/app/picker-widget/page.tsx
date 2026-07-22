"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { pickerApi, ViewerPicker } from "@/lib/api/viewerPicker";
import { getSocket } from "@/lib/socket";
import RandomizerCannon from "@/components/viewerPicker/RandomizerCannon";

export default function PickerWidgetPage() {
  const [picker, setPicker] = useState<ViewerPicker | null>(null);
  const [pendingWinner, setPendingWinner] = useState<ViewerPicker["winner"]>(null);
  const prevIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Force transparent background for OBS
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = "html,body{background:transparent!important;margin:0;padding:0}";
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await pickerApi.getActive();
      setPicker(data ?? null);
    } catch { /* ignore */ }
  }, []);

  // Poll every 20s as fallback
  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  // Follow the active picker's Socket.IO room
  useEffect(() => {
    const socket = getSocket();
    if (prevIdRef.current && prevIdRef.current !== picker?.id) {
      socket.emit("leavePicker", prevIdRef.current);
    }
    if (!picker?.id) return;

    socket.emit("joinPicker", picker.id);
    prevIdRef.current = picker.id;

    const onUpdate = (updated: ViewerPicker) => {
      if (updated.id !== picker.id) return;
      setPicker(updated);
      if (updated.status === "COMPLETED" && prevStatusRef.current !== "COMPLETED") {
        setPendingWinner(updated.winner);
      }
      prevStatusRef.current = updated.status;
      if (updated.status === "COMPLETED") setTimeout(load, 15_000);
    };

    socket.on("picker:updated", onUpdate);
    return () => { socket.off("picker:updated", onUpdate); };
  }, [picker?.id, load]);

  if (!picker) {
    return (
      <div className="p-2 w-[220px]">
        <div className="bg-black/55 border border-white/8 rounded-xl px-3 py-3 text-center">
          <p className="text-2xl mb-1">🎯</p>
          <p className="text-white/45 text-[10px] tracking-widest uppercase">No Active Draw</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 w-[260px]">
      <div className="bg-black/60 border border-cyan-500/20 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/6">
          <span className="text-white font-bold text-xs truncate">{picker.label ?? picker.keyword}</span>
          {picker.status === "OPEN" && (
            <span className="text-cyan-400 font-mono text-[11px] font-bold shrink-0">{picker.keyword}</span>
          )}
        </div>
        <div className="p-2">
          <RandomizerCannon entries={picker.entries} winner={pendingWinner} compact />
        </div>
      </div>
    </div>
  );
}
