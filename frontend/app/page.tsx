"use client";

import { motion } from "framer-motion";
import Hero from "@/components/Hero";
import LiveStatus from "@/components/LiveStatus";
import StreamSchedule from "@/components/StreamSchedule";
import RecentHighlights from "@/components/RecentHighlights";
import SocialLinks from "@/components/SocialLinks";

export default function Home() {
  return (
    <div className="min-h-screen">
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
