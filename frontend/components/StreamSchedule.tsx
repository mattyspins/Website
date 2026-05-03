"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, Gamepad2 } from "lucide-react";
import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "@/lib/api";

interface ScheduleDay {
  day: string;
  streaming: boolean;
  startTime: string;
  endTime: string;
  activity?: string;
  note?: string;
}

const SCHEDULE_STORAGE_KEY = "stream_schedule";

const getActivityEmoji = (activity?: string) => {
  const emojiMap: Record<string, string> = {
    "Bonus Hunt": "🎰",
    Slots: "🎲",
    "Card Games": "🃏",
    "Table Games": "🎯",
    Roulette: "🎡",
    Blackjack: "🂡",
    Poker: "♠️",
    "Mixed Games": "🎮",
    "Special Event": "⭐",
    "Community Games": "👥",
  };
  return emojiMap[activity || ""] || "🎮";
};

const formatTime = (time: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getCurrentDay = () => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
};

export default function StreamSchedule() {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const currentDay = getCurrentDay();

  // Load schedule from API
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.SCHEDULE_CURRENT);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.schedule) {
            setSchedule(data.data.schedule);
          } else {
            setSchedule(getDefaultSchedule());
          }
        } else {
          console.error("Failed to load schedule from API");
          setSchedule(getDefaultSchedule());
        }
      } catch (error) {
        console.error("Failed to load schedule:", error);
        // Fallback to localStorage for backward compatibility
        const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
        if (saved) {
          try {
            setSchedule(JSON.parse(saved));
          } catch (parseError) {
            console.error("Failed to parse saved schedule:", parseError);
            setSchedule(getDefaultSchedule());
          }
        } else {
          setSchedule(getDefaultSchedule());
        }
      }
    };

    loadSchedule();

    // Listen for schedule updates from admin dashboard
    const handleScheduleUpdate = (event: any) => {
      setSchedule(event.detail);
    };

    window.addEventListener("scheduleUpdated", handleScheduleUpdate);

    return () => {
      window.removeEventListener("scheduleUpdated", handleScheduleUpdate);
    };
  }, []);

  const getDefaultSchedule = (): ScheduleDay[] => [
    {
      day: "Monday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
    {
      day: "Tuesday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
    {
      day: "Wednesday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
    {
      day: "Thursday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
    {
      day: "Friday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
    {
      day: "Saturday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
    {
      day: "Sunday",
      streaming: false,
      startTime: "",
      endTime: "",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="w-6 h-6 text-neon-gold" />
        <h2 className="text-2xl font-bold">Stream Schedule</h2>
      </div>

      <div className="space-y-4">
        {schedule.map((item, index) => {
          const isToday = item.day === currentDay;

          return (
            <motion.div
              key={item.day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
              className={`p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${
                !item.streaming
                  ? "bg-red-500/10 border-red-500/50 opacity-60"
                  : isToday
                    ? "bg-neon-gold/20 border-neon-gold neon-glow"
                    : "bg-gray-800/30 border-gray-700 hover:border-gray-600"
              }`}
            >
              {item.streaming ? (
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`font-bold ${isToday ? "text-neon-gold" : "text-white"}`}
                      >
                        {item.day}
                      </span>
                      {isToday && (
                        <span className="bg-neon-gold text-black px-2 py-1 rounded-full text-xs font-bold">
                          TODAY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-gray-300 mb-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatTime(item.startTime)} -{" "}
                        {formatTime(item.endTime)}
                      </span>
                    </div>

                    {item.activity && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">
                          {getActivityEmoji(item.activity)}
                        </span>
                        <span className="font-semibold">{item.activity}</span>
                      </div>
                    )}
                  </div>

                  {item.activity && (
                    <div className="text-right">
                      <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                        {item.activity}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-red-400">{item.day}</span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      NO STREAM
                    </span>
                  </div>
                  {item.note && (
                    <span className="text-gray-400 text-sm italic">
                      {item.note}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30"
      >
        <p className="text-sm text-gray-300 text-center">
          <span className="text-neon-pink font-semibold">Pro Tip:</span> Follow
          for notifications when streams go live!
        </p>
      </motion.div>
    </motion.div>
  );
}
