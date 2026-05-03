"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import LiveStatus from "@/components/LiveStatus";
import StreamSchedule from "@/components/StreamSchedule";
import RecentHighlights from "@/components/RecentHighlights";
import SocialLinks from "@/components/SocialLinks";

export default function Home() {
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info">("info");

  useEffect(() => {
    const loginRequired = searchParams.get("login");
    const error = searchParams.get("error");

    if (loginRequired === "required") {
      setMessage("Please login with Discord to access this page");
      setMessageType("info");
      setShowMessage(true);
    } else if (error === "admin_required") {
      setMessage("Admin access required");
      setMessageType("error");
      setShowMessage(true);
    } else if (error === "moderator_required") {
      setMessage("Moderator access required");
      setMessageType("error");
      setShowMessage(true);
    }

    if (showMessage) {
      setTimeout(() => setShowMessage(false), 5000);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-lg ${
            messageType === "error"
              ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          <p className="font-semibold">{message}</p>
        </motion.div>
      )}

      <Hero />

      <motion.section
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto">
          <LiveStatus />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-16">
            <RecentHighlights />
            <StreamSchedule />
          </div>

          <SocialLinks />
        </div>
      </motion.section>
    </div>
  );
}
