"use client";

import { motion } from "framer-motion";
import { ExternalLink, Gift, CheckCircle, AlertCircle, Ticket, Calendar } from "lucide-react";

const DEPOSIT_TIERS = [
  { deposit: 30,  reward: 10  },
  { deposit: 50,  reward: 20  },
  { deposit: 100, reward: 50  },
  { deposit: 250, reward: 100 },
];

const REQUIREMENTS = [
  "Must be a FIRST TIME depositor using the affiliate link above",
  "Promo available to players from UK, EU, US, Canada, Australia & New Zealand",
  "Must be following Kick, Instagram & X (links above)",
  "Must be inside the Discord server",
  "Deposits must be wagered 3x before reward is eligible",
  "Dice & Limbo wagering does NOT count towards wager requirements",
  "One reward per person / account / device / payment method / IP",
  "Any abuse, bonus hunting or multi-accounting will void eligibility",
];

const SOCIALS = [
  { label: "Kick", url: "https://kick.com/mattyspinsslots", color: "text-[#53FC18]", bg: "bg-[#53FC18]/10 border-[#53FC18]/25" },
  { label: "Instagram", url: "https://www.instagram.com/mattyspinsslots/", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/25" },
  { label: "X / Twitter", url: "https://x.com/mattyspinsslots", color: "text-gray-300", bg: "bg-white/5 border-white/15" },
];

export default function RewardsPage() {
  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            New Community Bonus
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-gaming text-white mb-3 tracking-wide">
            DEPO<span className="text-gold-400">SIT BONUS</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            To celebrate the new partnership, signing up through the link below can claim a cash bonus.
          </p>
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mt-4">
            <AlertCircle className="w-3.5 h-3.5" />
            First Time Depositors Only
          </div>
        </motion.div>

        {/* CTA link */}
        <motion.a
          href="https://a.acebet.com/api/click?a=374&lp=194&c=426"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl mb-8 transition-all shadow-lg shadow-gold-500/20"
        >
          <Gift className="w-5 h-5" />
          Sign Up on AceBet (Affiliate Link)
          <ExternalLink className="w-4 h-4" />
        </motion.a>

        {/* Follow requirements */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 justify-center mb-8"
        >
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-semibold ${s.color} ${s.bg} hover:opacity-80 transition-opacity`}
            >
              {s.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </motion.div>

        {/* Deposit tiers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
            <Gift className="w-4 h-4 text-gold-400" />
            Reward Tiers
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DEPOSIT_TIERS.map((tier) => (
              <div
                key={tier.deposit}
                className="bg-navy-900/60 border border-gold-500/15 rounded-xl p-4 text-center"
              >
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Deposit</p>
                <p className="text-white font-black text-xl mb-3">${tier.deposit}+</p>
                <div className="h-px bg-gold-500/20 mb-3" />
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Receive</p>
                <p className="text-green-400 font-black text-2xl">${tier.reward}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Requirements
          </h2>
          <ul className="space-y-3">
            {REQUIREMENTS.map((req, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                </span>
                {req}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* How to claim */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-gold-400" />
            How to Claim
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Open a ticket in the Discord server and include all of the following:
          </p>
          <div className="space-y-2">
            {["Your casino username", "Proof of deposit", "Proof of follows / Discord membership"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-navy-900/60 border border-white/5 rounded-lg px-4 py-3">
                <span className="text-gold-400 font-black text-xs">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-gray-300 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payout schedule */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Payout Schedule
          </h2>
          <p className="text-gray-400 text-sm">
            All deposit bonuses are paid out on the{" "}
            <span className="text-white font-semibold">1st of each month</span>{" "}
            once deposits and referrals have been verified.
          </p>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="bg-red-500/8 border border-red-500/25 rounded-2xl p-6"
        >
          <h2 className="text-red-400 font-bold text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Important
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Make sure you sign up using the{" "}
            <a
              href="https://a.acebet.com/api/click?a=374&lp=194&c=426"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 underline underline-offset-2 font-semibold"
            >
              affiliate link
            </a>{" "}
            in this page rather than entering a code manually — otherwise your account may not track correctly. Appreciate all the support, more promos and giveaways coming soon!
          </p>
        </motion.div>

      </div>
    </div>
  );
}
