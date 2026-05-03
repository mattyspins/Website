"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

const activityOptions = [
  "Bonus Hunt",
  "Slots",
  "Card Games",
  "Table Games",
  "Roulette",
  "Blackjack",
  "Poker",
  "Mixed Games",
  "Special Event",
  "Community Games",
];

export default function AdminSchedule() {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    {
      day: "Monday",
      streaming: true,
      startTime: "18:00",
      endTime: "23:00",
      activity: "Bonus Hunt",
    },
    {
      day: "Tuesday",
      streaming: true,
      startTime: "18:00",
      endTime: "23:00",
      activity: "Slots",
    },
    {
      day: "Wednesday",
      streaming: false,
      startTime: "",
      endTime: "",
      note: "Day off",
    },
    {
      day: "Thursday",
      streaming: true,
      startTime: "18:00",
      endTime: "23:00",
      activity: "Card Games",
    },
    {
      day: "Friday",
      streaming: true,
      startTime: "18:00",
      endTime: "01:00",
      activity: "Bonus Hunt",
    },
    {
      day: "Saturday",
      streaming: true,
      startTime: "14:00",
      endTime: "02:00",
      activity: "Table Games",
    },
    {
      day: "Sunday",
      streaming: true,
      startTime: "14:00",
      endTime: "22:00",
      activity: "Slots",
    },
  ]);

  const [editingDay, setEditingDay] = useState<string | null>(null);

  // Load schedule from API on mount
  useEffect(() => {
    loadScheduleFromAPI();
  }, []);

  const loadScheduleFromAPI = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE_CURRENT);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.schedule) {
          setSchedule(data.data.schedule);
        }
      } else {
        console.error("Failed to load schedule from API");
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  };

  const toggleStreaming = (day: string) => {
    setSchedule(
      schedule.map((s) =>
        s.day === day ? { ...s, streaming: !s.streaming } : s,
      ),
    );
  };

  const updateTime = (
    day: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setSchedule(
      schedule.map((s) => (s.day === day ? { ...s, [field]: value } : s)),
    );
  };

  const updateActivity = (day: string, activity: string) => {
    setSchedule(schedule.map((s) => (s.day === day ? { ...s, activity } : s)));
  };

  const updateNote = (day: string, note: string) => {
    setSchedule(schedule.map((s) => (s.day === day ? { ...s, note } : s)));
  };

  const saveSchedule = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        alert("❌ Please log in to save schedule");
        return;
      }

      const response = await fetch(API_ENDPOINTS.SCHEDULE_UPDATE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ schedule }),
      });

      if (response.ok) {
        // Also save to localStorage for immediate local updates
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("scheduleUpdated", { detail: schedule }),
        );

        alert(
          "✅ Schedule saved successfully! Changes are now visible to all users.",
        );
      } else {
        const errorData = await response.json();
        alert(
          `❌ Failed to save schedule: ${errorData.error?.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Failed to save schedule:", error);
      alert("❌ Failed to save schedule. Please try again.");
    }
  };

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

  return (
    <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Stream Schedule</h2>
        <button
          onClick={saveSchedule}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
        >
          💾 Save Schedule
        </button>
      </div>

      <div className="space-y-4">
        {schedule.map((day) => (
          <motion.div
            key={day.day}
            whileHover={{ scale: 1.01 }}
            className={`p-4 rounded-lg transition-all ${
              day.streaming
                ? "bg-purple-500/10 border-2 border-purple-500/30"
                : "bg-red-500/10 border-2 border-red-500"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-bold text-white">{day.day}</h3>
                <button
                  onClick={() => toggleStreaming(day.day)}
                  className={`px-4 py-1 rounded-full text-sm font-semibold transition-colors ${
                    day.streaming
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {day.streaming ? "✅ Streaming" : "🚫 No Stream"}
                </button>
                {day.streaming && day.activity && (
                  <span className="text-2xl">
                    {getActivityEmoji(day.activity)}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setEditingDay(editingDay === day.day ? null : day.day)
                }
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                {editingDay === day.day ? "✅ Done" : "✏️ Edit"}
              </button>
            </div>

            {day.streaming ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) =>
                        updateTime(day.day, "startTime", e.target.value)
                      }
                      disabled={editingDay !== day.day}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) =>
                        updateTime(day.day, "endTime", e.target.value)
                      }
                      disabled={editingDay !== day.day}
                      className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">
                    Activity
                  </label>
                  <select
                    value={day.activity || ""}
                    onChange={(e) => updateActivity(day.day, e.target.value)}
                    disabled={editingDay !== day.day}
                    className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="">Select activity...</option>
                    {activityOptions.map((activity) => (
                      <option key={activity} value={activity}>
                        {getActivityEmoji(activity)} {activity}
                      </option>
                    ))}
                  </select>
                </div>

                {day.activity && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-purple-300 text-sm">
                      <span className="text-2xl mr-2">
                        {getActivityEmoji(day.activity)}
                      </span>
                      <span className="font-semibold">{day.activity}</span>
                      <span className="text-gray-400 ml-2">
                        • {day.startTime} - {day.endTime}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={day.note || ""}
                  onChange={(e) => updateNote(day.day, e.target.value)}
                  disabled={editingDay !== day.day}
                  placeholder="e.g., Day off, Vacation, etc."
                  className="w-full px-3 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 disabled:opacity-50"
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2">💡 Tips:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>
            • Days with streaming are bordered in{" "}
            <span className="text-purple-400">purple</span>
          </li>
          <li>
            • Days without streaming are bordered in{" "}
            <span className="text-red-400">red</span>
          </li>
          <li>
            • Select an activity for each streaming day (Bonus Hunt, Slots,
            etc.)
          </li>
          <li>• Click "Edit" to modify times, activities, or notes</li>
          <li>
            • Changes are{" "}
            <span className="text-green-400 font-semibold">
              immediately visible
            </span>{" "}
            on the homepage after saving!
          </li>
        </ul>
      </div>
    </div>
  );
}
