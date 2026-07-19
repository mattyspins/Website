"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Coins, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api";
import { getAccessToken } from "@/lib/authPersistence";

// Matches Hero and IntroSplash — the homepage shares one curve.
const EASE = [0.16, 1, 0.3, 1] as const;

interface LinkStep {
  done: boolean;
  pending: boolean;
  username: string | null;
}

interface ActivationSteps {
  kick: LinkStep;
  dailyCheckIn: { done: boolean; reward: number };
  razed: LinkStep;
  firstRaffle: { done: boolean };
}

interface ChecklistItem {
  key: string;
  title: string;
  desc: string;
  done: boolean;
  /** Submitted but awaiting verification — no action left for the user to take. */
  pending: boolean;
  /** Steps resolve either by navigating somewhere or by claiming in place. */
  href?: string;
  cta?: string;
  onClaim?: () => void;
  /** Marks a step that leads to gambling, so it carries an 18+ badge. */
  adult?: boolean;
}

export default function ActivationChecklist() {
  const reduce = useReducedMotion();
  const [steps, setSteps] = useState<ActivationSteps | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    // Logged out: stay silent rather than inviting a login here. The navbar
    // already owns that call to action, and Hero is the pitch for visitors.
    if (!token) {
      setSteps(null);
      return;
    }
    try {
      const res = await fetch(API_ENDPOINTS.ACTIVATION_STATUS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setSteps(null);
        return;
      }
      const data = await res.json();
      if (data.success) setSteps(data.steps);
    } catch {
      // A checklist is an enhancement — a failed fetch hides it rather than
      // pushing an error onto a page the user came to for something else.
      setSteps(null);
    }
  }, []);

  useEffect(() => {
    load();
    // Linking Kick or Razed happens on /profile, so the user returns to this tab
    // with state this component has no other way to learn about.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("coins-updated", load);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("coins-updated", load);
    };
  }, [load]);

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(API_ENDPOINTS.CHECKIN_CLAIM, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSteps((s) => (s ? { ...s, dailyCheckIn: { ...s.dailyCheckIn, done: true } } : s));
        // Tells the navbar balance to refresh — same event the store and profile use.
        window.dispatchEvent(new Event("coins-updated"));
      } else {
        // The usual failure here is a claim already made in another tab, which is
        // a completed step, not an error worth shouting about.
        setClaimError(data.error?.message || "Already claimed today.");
        setSteps((s) => (s ? { ...s, dailyCheckIn: { ...s.dailyCheckIn, done: true } } : s));
      }
    } catch {
      setClaimError("Couldn't claim right now. Try again.");
    } finally {
      setClaiming(false);
    }
  };

  // Nothing to show while loading, logged out, or on failure — the section is
  // absent rather than an empty shell.
  if (!steps) return null;

  const items: ChecklistItem[] = [
    {
      key: "kick",
      title: "Link your Kick account",
      desc: steps.kick.pending
        ? `Waiting on verification for ${steps.kick.username}.`
        : "This is what earns you coins for watching the stream.",
      done: steps.kick.done,
      pending: steps.kick.pending,
      href: "/profile",
      cta: "Link Kick",
    },
    {
      key: "checkin",
      title: "Claim your daily check-in",
      desc: `Free ${steps.dailyCheckIn.reward} coins, every day. Takes one click.`,
      done: steps.dailyCheckIn.done,
      pending: false,
      onClaim: handleClaim,
    },
    {
      key: "raffle",
      title: "Enter your first raffle",
      desc: "Spend coins on tickets for a shot at the prize pool.",
      done: steps.firstRaffle.done,
      pending: false,
      href: "/raffle",
      cta: "Browse raffles",
    },
    {
      key: "razed",
      title: "Link your Razed username",
      desc: steps.razed.pending
        ? `${steps.razed.username} is submitted — an admin will verify it shortly.`
        : "Puts you on the wager leaderboard for monthly cash prizes.",
      done: steps.razed.done,
      pending: steps.razed.pending,
      href: "/profile",
      cta: "Add username",
      adult: true,
    },
  ];

  const completed = items.filter((i) => i.done).length;

  // A finished checklist is clutter. Once every step is done it never returns,
  // because none of these steps can regress — except the daily check-in, which
  // is why "done" here means done for today and the card comes back tomorrow.
  if (completed === items.length) return null;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
      aria-labelledby="activation-heading"
      className="px-4 pb-16 max-w-3xl mx-auto"
    >
      <div className="bg-ink-card/80 border border-white/8 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h2
            id="activation-heading"
            className="font-gaming text-xl md:text-2xl font-bold text-premtext-primary"
          >
            Get set up
          </h2>
          <span className="text-sm text-premtext-secondary tabular-nums shrink-0">
            {completed} of {items.length} done
          </span>
        </div>
        <p className="text-premtext-secondary text-sm mb-5">
          A few quick steps to start earning.
        </p>

        {/* Progress bar is decorative — the "{completed} of {n} done" count above
            already carries this for assistive tech. */}
        <div aria-hidden="true" className="h-1 rounded-full bg-white/8 overflow-hidden mb-6">
          {/* initial={false} starts at the target, so a reduced-motion user gets the
              filled bar outright rather than a bar that fills. */}
          <motion.div
            className="h-full bg-accent-gold rounded-full"
            initial={reduce ? false : { width: 0 }}
            whileInView={{ width: `${(completed / items.length) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.2, ease: EASE }}
          />
        </div>

        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li
              key={item.key}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                item.done
                  ? "border-white/5 bg-white/[0.02]"
                  : "border-white/8 bg-white/[0.04]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                  item.done
                    ? "bg-accent-gold/15 border-accent-gold/40 text-accent-gold"
                    : "border-white/15 text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`font-semibold text-sm ${
                      item.done
                        ? "text-premtext-secondary line-through decoration-white/20"
                        : "text-premtext-primary"
                    }`}
                  >
                    {item.title}
                  </h3>
                  {item.adult && !item.done && (
                    <span className="border border-red-500/40 text-red-400 font-bold px-1.5 rounded text-[10px] shrink-0">
                      18+
                    </span>
                  )}
                  {item.pending && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-accent-silver/80 border border-white/15 rounded px-1.5 shrink-0">
                      Pending
                    </span>
                  )}
                </div>
                {!item.done && (
                  <p className="text-premtext-secondary text-xs mt-0.5">{item.desc}</p>
                )}
                {item.key === "checkin" && claimError && (
                  <p className="text-premtext-secondary text-xs mt-1">{claimError}</p>
                )}
              </div>

              {/* A pending step has no action left for the user to take. */}
              {!item.done && !item.pending && (
                <div className="shrink-0">
                  {item.onClaim ? (
                    <button
                      onClick={item.onClaim}
                      disabled={claiming}
                      aria-busy={claiming}
                      className="tap-target inline-flex items-center gap-1.5 bg-accent-gold/15 hover:bg-accent-gold/25 border border-accent-gold/35 text-accent-gold px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {claiming ? (
                        <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
                      ) : (
                        <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {claiming ? "Claiming" : `Claim +${steps.dailyCheckIn.reward}`}
                    </button>
                  ) : (
                    <Link
                      href={item.href!}
                      className="tap-target inline-flex items-center gap-1.5 border border-white/12 bg-white/5 hover:bg-white/10 text-premtext-primary px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      {item.cta}
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                      <span className="sr-only"> — {item.title}</span>
                    </Link>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
