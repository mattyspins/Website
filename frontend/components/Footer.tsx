"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ExternalLink, Shield, Heart } from "lucide-react";
import MattySpinsAvatar from "./MattySpinsAvatar";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { name: "Home", href: "/" },
      { name: "Leaderboards", href: "/leaderboard" },
      { name: "Bonus Hunt", href: "/bonus-hunt" },
      { name: "Store", href: "/store" },
    ],
    community: [
      {
        name: "Discord",
        href: "https://discord.gg/n2gCDVwebw",
        external: true,
      },
      {
        name: "Kick Stream",
        href: "https://kick.com/mattyspinsslots",
        external: true,
      },
      {
        name: "Rainbet",
        href: "https://rainbet.com?r=mattyspins",
        external: true,
      },
    ],
    legal: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Responsible Gaming", href: "/responsible-gaming" },
    ],
  };

  return (
    <footer className="bg-black/80 backdrop-blur-lg border-t border-gray-700/50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <MattySpinsAvatar size={40} showGlow={false} />
              <span className="text-xl font-bold text-white">MattySpins</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Premium gaming community with live streams, competitive
              leaderboards, and epic bonus hunts. Join the ultimate gaming
              experience.
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Shield className="w-4 h-4" />
              <span>SSL Secured</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors text-sm flex items-center space-x-1"
                    >
                      <span>{link.name}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700/50 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © {currentYear} MattySpins. All rights reserved.
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center space-x-1">
                <span>Made with</span>
                <Heart className="w-4 h-4 text-red-500" />
                <span>for the gaming community</span>
              </span>
            </div>
          </div>

          {/* Responsible Gaming Notice */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-xs text-center">
              <strong>Responsible Gaming:</strong> Please gamble responsibly. If
              you or someone you know has a gambling problem, seek help at{" "}
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-200"
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
