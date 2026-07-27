"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ms_tournament_age_confirmed";

/**
 * Persisted via localStorage (not sessionStorage) — this is a compliance
 * artifact, not a "show once per visit" marketing intro like WelcomeSplash,
 * so it needs to survive across sessions once accepted.
 */
export default function AgeGateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-[color:var(--tt-bg-sunken)]/95">
      <div className="max-w-[420px] w-full bg-[color:var(--tt-bg-elevated)] border border-[color:var(--tt-border)] rounded p-8 text-center">
        <div className="tt-display text-sm tracking-[0.2em] text-[color:var(--tt-pink)]">RESTRICTED ACCESS</div>
        <div className="tt-display text-5xl my-1.5">18+ ONLY</div>
        <p className="text-white/70 text-sm leading-relaxed mb-5">
          This tournament involves real-money slot session results. You must be 18 or older (or the legal age in your
          jurisdiction) and legally permitted to view gambling-related content where you live.
        </p>
        <button
          onClick={accept}
          className="w-full bg-[color:var(--tt-gold)] text-[color:var(--tt-gold-text)] tt-display text-lg tracking-wide rounded py-3.5 hover:bg-[color:var(--tt-gold-hover)] transition-colors"
        >
          I CONFIRM I AM 18+ &amp; ELIGIBLE
        </button>
        <div className="mt-3.5 text-[11px] text-white/50">
          Struggling with gambling? Visit{" "}
          <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-[color:var(--tt-pink)]">
            begambleaware.org
          </a>
        </div>
      </div>
    </div>
  );
}
