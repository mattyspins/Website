"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

const PLATFORM_LINKS = [
  { name: "Home",              href: "/" },
  { name: "Leaderboard",       href: "/leaderboard" },
  { name: "Milestones",        href: "/milestones" },
  { name: "Guess the Balance", href: "/bonus-hunt" },
  { name: "Stream Games",      href: "/stream-games" },
  { name: "Rewards",           href: "/rewards" },
  { name: "Store",             href: "/store" },
];

const COMMUNITY_LINKS = [
  { name: "Discord",   href: "https://discord.gg/n2gCDVwebw" },
  { name: "Kick",      href: "https://kick.com/mattyspinsslots" },
  { name: "Instagram", href: "https://www.instagram.com/mattyspinsslots/" },
  { name: "X",         href: "https://x.com/mattyspinsslots" },
];

const LEGAL_LINKS = [
  { name: "Terms of Service",   href: "/terms" },
  { name: "Privacy Policy",     href: "/privacy" },
  { name: "Responsible Gaming", href: "/responsible-gaming" },
];

export default function Footer() {
  return (
    <footer className="bg-navy-900/80 border-t border-gold-500/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-gaming text-lg font-bold text-white tracking-wider">
              MATTY<span className="text-gold-400">SPINS</span>
            </span>
            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              Live leaderboards, bonus hunts, stream games and exclusive community rewards.
            </p>
            {/* Socials */}
            <div className="flex gap-2 mt-5">
              {/* X */}
              <a href="https://x.com/mattyspinsslots" target="_blank" rel="noopener noreferrer" aria-label="X"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-500 hover:text-white">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.855L1.872 2.25H8.08l4.261 5.636 5.903-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* Instagram */}
              <a href="https://www.instagram.com/mattyspinsslots/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#E4405F]/15 flex items-center justify-center transition-colors text-gray-500 hover:text-[#E4405F]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              {/* Kick */}
              <a href="https://kick.com/mattyspinsslots" target="_blank" rel="noopener noreferrer" aria-label="Kick"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#53FC18]/10 flex items-center justify-center transition-colors">
                <div className="w-4 h-4 bg-[#53FC18] rounded-sm flex items-center justify-center">
                  <span className="text-black text-[9px] font-bold leading-none">K</span>
                </div>
              </a>
              {/* Discord */}
              <a href="https://discord.gg/n2gCDVwebw" target="_blank" rel="noopener noreferrer" aria-label="Discord"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#5865F2]/20 flex items-center justify-center transition-colors text-gray-500 hover:text-[#5865F2]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Platform</h3>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Community</h3>
            <ul className="space-y-2.5">
              {COMMUNITY_LINKS.map((l) => (
                <li key={l.name}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors inline-flex items-center gap-1.5">
                    {l.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Responsible gambling */}
        <div className="border-t border-white/5 pt-8 mb-8">
          <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5 flex items-start gap-4 max-w-2xl">
            <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-red-400 font-bold text-xs uppercase tracking-widest mb-1">Play Responsibly</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Gambling can be addictive. Only bet what you can afford to lose. If you need help, visit{" "}
                <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">
                  BeGambleAware.org
                </a>
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="border border-red-500/30 text-red-400 text-xs font-bold px-2 py-0.5 rounded">18+</span>
                <span className="text-gray-600 text-xs">Adults only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} MattySpins. All rights reserved.
          </p>
          <p className="text-gray-700 text-xs">
            Not affiliated with any gambling operator. For entertainment purposes.
          </p>
        </div>

      </div>
    </footer>
  );
}
