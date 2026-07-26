"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radio, Play, ExternalLink } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

// Matches the sync job's own staleness budget elsewhere on the site — frequent
// enough to feel live, not so frequent it hammers the Kick API on every visitor.
const POLL_MS = 60_000;

interface StreamStatus {
  isLive: boolean;
  stream: {
    title?: string | null;
    viewerCount?: number | null;
  } | null;
}

export default function LiveStatusSection() {
  const [status, setStatus] = useState<StreamStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(API_ENDPOINTS.VIEWING_STREAM_STATUS)
        .then((r) => r.json())
        .then((d) => { if (!cancelled && d.success) setStatus(d.data); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const isLive = status?.isLive ?? false;

  return (
    <section className="pt-16 sm:pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`rounded-2xl border p-10 transition-colors duration-500 ${
            isLive ? "bg-red-500/5 border-red-500/30" : "bg-navy-800/40 border-white/5"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
              isLive ? "bg-red-500/20" : "bg-white/5"
            }`}
          >
            <Radio className={`w-7 h-7 ${isLive ? "text-red-400" : "text-gray-500"}`} />
          </div>

          <span
            className={`inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 ${
              isLive
                ? "bg-red-500/20 text-red-400 border border-red-500/30 motion-safe:animate-pulse"
                : "bg-white/5 text-gray-400 border border-white/10"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-red-400" : "bg-gray-500"}`} />
            {isLive ? "Live Now" : "Offline"}
          </span>

          <h2 className="text-2xl md:text-3xl font-bold font-gaming text-white tracking-wide mb-2">
            {isLive ? status?.stream?.title || "MattySpins is live!" : "Not streaming right now"}
          </h2>

          <p className="text-gray-400 text-sm mb-6">
            {isLive
              ? status?.stream?.viewerCount != null
                ? `${status.stream.viewerCount.toLocaleString()} watching on Kick`
                : "Watching on Kick right now"
              : "Follow on Kick to get notified the moment the stream goes live."}
          </p>

          <a
            href="https://kick.com/mattyspinsslots"
            target="_blank"
            rel="noopener noreferrer"
            className={`tap-target inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all motion-safe:hover:scale-105 ${
              isLive
                ? "bg-[#53FC18] hover:bg-[#45D615] text-black"
                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
            }`}
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            {isLive ? "Watch Live" : "Follow on Kick"}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">(opens Kick in a new tab)</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
