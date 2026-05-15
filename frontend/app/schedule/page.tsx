"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Gamepad2, Radio } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface StreamEvent {
  id: string;
  title: string;
  scheduledAt: string;
  gameType?: string;
  description?: string;
  isLive: boolean;
}

function groupByDay(events: StreamEvent[]) {
  const map: Record<string, StreamEvent[]> = {};
  for (const e of events) {
    const day = new Date(e.scheduledAt).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    if (!map[day]) map[day] = [];
    map[day].push(e);
  }
  return map;
}

export default function SchedulePage() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ENDPOINTS.STREAM_EVENTS)
      .then((r) => r.json())
      .then((d) => { if (d.success) setEvents(d.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByDay(events);
  const days = Object.keys(grouped);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            Upcoming Streams
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-gaming text-white tracking-wide mb-3">
            STREAM <span className="text-gold-400">SCHEDULE</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Never miss a stream. All times are shown in your local timezone.
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-navy-800/60 border border-white/5 rounded-xl p-6 animate-pulse h-32" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming streams scheduled yet.</p>
            <p className="text-gray-600 text-sm mt-1">Check back soon or follow on Discord for announcements.</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {days.map((day, di) => (
              <motion.div key={day} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.05 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-widest">{day}</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <div className="space-y-3">
                  {grouped[day].map((event) => {
                    const time = new Date(event.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "numeric", minute: "2-digit",
                    });
                    return (
                      <div
                        key={event.id}
                        className={`bg-navy-800/60 border rounded-xl p-5 flex items-start gap-4 ${
                          event.isLive
                            ? "border-red-500/30 bg-red-500/5"
                            : "border-white/6"
                        }`}
                      >
                        {event.isLive ? (
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Radio className="w-5 h-5 text-red-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-5 h-5 text-gold-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-semibold">{event.title}</h3>
                            {event.isLive && (
                              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded animate-pulse">
                                LIVE NOW
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-gold-400 text-sm font-medium">{time}</span>
                            {event.gameType && (
                              <span className="flex items-center gap-1 text-gray-500 text-xs">
                                <Gamepad2 className="w-3 h-3" />
                                {event.gameType}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-gray-500 text-sm mt-1.5">{event.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
