"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AuthButtons from "./AuthButtons";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Leaderboard", href: "/leaderboard" },
  { name: "Raffles", href: "/raffles" },
  { name: "Milestones", href: "/milestones" },
  { name: "Stream Games", href: "/stream-games" },
  { name: "Rewards", href: "/rewards" },
  { name: "Store", href: "/store" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    // passive: the handler never calls preventDefault, so this keeps scrolling
    // off the main thread's critical path.
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape closes the mobile menu — expected of any disclosure/overlay.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav
        aria-label="Main"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || isOpen
            ? "bg-navy-900/95 backdrop-blur-md border-b border-gold-500/10 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/mattyspins-logo.png"
                alt="MattySpins"
                width={36}
                height={36}
                className="rounded-full"
                priority
              />
              <span className="text-lg font-gaming font-bold text-white tracking-wider group-hover:text-gold-400 transition-colors">
                MATTY<span className="text-gold-400">SPINS</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-gold-400 bg-gold-500/10 border border-gold-500/20"
                        : "text-gray-400 hover:text-gold-300 hover:bg-gold-500/5"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Auth + Mobile toggle */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block" data-auth-button>
                <AuthButtons />
              </div>

              <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
                aria-controls="mobile-nav"
                className="tap-target md:hidden text-gray-400 hover:text-white transition-colors p-2.5 -mr-2.5 rounded-lg inline-flex items-center justify-center"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu — full-width panel with solid background */}
        {isOpen && (
          <div id="mobile-nav" className="md:hidden border-t border-white/5 bg-navy-900 px-4 sm:px-6 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-gold-400 bg-gold-500/10"
                      : "text-gray-400 hover:text-gold-300 hover:bg-gold-500/5"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            <AuthButtons inline onNavigate={() => setIsOpen(false)} />
          </div>
        )}
      </nav>
    </>
  );
}
