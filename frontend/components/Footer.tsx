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
      { name: "X / Twitter", href: "https://x.com/mattyspinsslots" },
      { name: "Instagram", href: "https://www.instagram.com/mattyspinsslots/" },
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
            {/* Social icons */}
            <div className="flex gap-2.5 mt-4">
              <a
                href="https://x.com/mattyspinsslots"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/12 flex items-center justify-center transition-colors text-gray-500 hover:text-white"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.855L1.872 2.25H8.08l4.261 5.636 5.903-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/mattyspinsslots/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#E4405F]/15 flex items-center justify-center transition-colors text-gray-500 hover:text-[#E4405F]"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://kick.com/mattyspinsslots"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kick"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#53FC18]/10 flex items-center justify-center transition-colors"
              >
                <div className="w-4 h-4 bg-[#53FC18] rounded-sm flex items-center justify-center">
                  <span className="text-black text-[9px] font-bold leading-none">K</span>
                </div>
              </a>
            </div>
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
