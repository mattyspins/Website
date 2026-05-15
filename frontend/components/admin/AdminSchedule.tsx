"use client";

import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";
import { Trash2, Radio } from "lucide-react";

interface StreamEvent {
  id: string;
  title: string;
  scheduledAt: string;
  gameType?: string;
  description?: string;
  isLive: boolean;
}

export default function AdminSchedule() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [gameType, setGameType] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { loadEvents(); }, []);

  const token = () => localStorage.getItem("access_token") ?? "";

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.STREAM_EVENTS_ALL, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await res.json();
      if (d.success) setEvents(d.events);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(API_ENDPOINTS.STREAM_EVENTS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title: title.trim(), scheduledAt, gameType: gameType.trim() || undefined, description: description.trim() || undefined }),
      });
      const d = await res.json();
      if (d.success) {
        setMsg({ type: "success", text: "Event created." });
        setTitle(""); setScheduledAt(""); setGameType(""); setDescription("");
        loadEvents();
      } else { setMsg({ type: "error", text: d.error || "Failed." }); }
    } catch { setMsg({ type: "error", text: "Network error." }); } finally { setSaving(false); }
  };

  const handleToggleLive = async (event: StreamEvent) => {
    try {
      await fetch(API_ENDPOINTS.STREAM_EVENT(event.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ isLive: !event.isLive }),
      });
      loadEvents();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await fetch(API_ENDPOINTS.STREAM_EVENT(id), { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      loadEvents();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add Stream Event</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Bonus Hunt Stream"
              className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Date &amp; Time *</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required
              className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Game / Type</label>
            <input value={gameType} onChange={(e) => setGameType(e.target.value)} placeholder="e.g. Slots, Bonus Hunt"
              className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details"
              className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
              {saving ? "Adding..." : "Add Event"}
            </button>
            {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
          </div>
        </form>
      </div>

      <div className="bg-navy-800/60 border border-white/6 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">All Events</h2>
        {loading ? <p className="text-gray-500 text-sm">Loading...</p> : events.length === 0 ? (
          <p className="text-gray-500 text-sm">No events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className={`flex items-center gap-4 p-4 rounded-xl border ${event.isLive ? "border-red-500/30 bg-red-500/5" : "border-white/5 bg-navy-900/40"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm truncate">{event.title}</p>
                    {event.isLive && <span className="bg-red-500/20 text-red-400 text-xs font-bold px-1.5 py-0.5 rounded shrink-0">LIVE</span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(event.scheduledAt).toLocaleString()}{event.gameType && ` · ${event.gameType}`}
                  </p>
                </div>
                <button onClick={() => handleToggleLive(event)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${event.isLive ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-white/10 text-gray-400 hover:text-white"}`}>
                  <Radio className="w-3 h-3" />{event.isLive ? "End Live" : "Set Live"}
                </button>
                <button onClick={() => handleDelete(event.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
