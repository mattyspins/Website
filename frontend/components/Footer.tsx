"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    platform: [
      { name: "Home", href: "/" },
      { name: "Leaderboard", href: "/leaderboard" },
      { name: "Guess the Balance", href: "/bonus-hunt" },
      { name: "Store", href: "/store" },
    ],
    community: [
      { name: "Discord", href: "https://discord.gg/n2gCDVwebw" },
      { name: "Kick", href: "https://kick.com/mattyspinsslots" },
      { name: "AceBet", href: "https://acebet.com" },
    ],
    legal: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Responsible Gaming", href: "/responsible-gaming" },
    ],
  };

  return (
    <footer className="bg-navy-900/80 border-t border-gold-500/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="font-gaming text-lg font-bold text-white tracking-wider">
              MATTY<span className="text-gold-400">SPINS</span>
            </span>
            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              Official AceBet partner. Premium streaming community with live
              leaderboards, bonus hunts, and exclusive rewards.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {links.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Community
            </h3>
            <ul className="space-y-2.5">
              {links.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors inline-flex items-center gap-1"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {links.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              &copy; {currentYear} MattySpins. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs text-center md:text-right max-w-md">
              <span className="text-yellow-600/70 font-medium">18+ only.</span>{" "}
              Gambling can be addictive. Play responsibly.{" "}
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-400 transition-colors"
              >
                BeGambleAware.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
