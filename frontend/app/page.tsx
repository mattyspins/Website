"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import StreamScheduleSection from "@/components/StreamScheduleSection";

export default function Home() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ msg: string; type: "error" | "info" } | null>(null);

  useEffect(() => {
    const loginRequired = searchParams.get("login");
    const error = searchParams.get("error");

    if (loginRequired === "required") {
      setToast({ msg: "Please log in to access that page.", type: "info" });
    } else if (error === "admin_required") {
      setToast({ msg: "Admin access required.", type: "error" });
    } else if (error === "moderator_required") {
      setToast({ msg: "Moderator access required.", type: "error" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="min-h-screen">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === "error"
              ? "bg-red-500/90 text-white border border-red-400/40"
              : "bg-navy-700/90 text-white border border-gold-500/30"
          }`}
        >
          {toast.msg}
        </motion.div>
      )}

      <Hero />
      <StreamScheduleSection />
    </div>
  );
}
