"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Trophy,
  Target,
  LogIn,
  Gift,
  ShoppingBag,
} from "lucide-react";
import AuthButtons from "./AuthButtons";
import MattySpinsAvatar from "./MattySpinsAvatar";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Bonus Hunt", href: "/bonus-hunt", icon: Target },
    { name: "Raffle", href: "/raffle", icon: Gift },
    { name: "Store", href: "/store", icon: ShoppingBag },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-700/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <MattySpinsAvatar size={32} showGlow={false} />
            <span className="text-xl font-bold neon-text text-neon-gold">
              MattySpins
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-2 text-gray-300 hover:text-neon-gold transition-colors duration-300 group"
              >
                <item.icon className="w-4 h-4 group-hover:animate-pulse" />
                <span>{item.name}</span>
              </Link>
            ))}

            <div data-auth-button>
              <AuthButtons />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-700/50 py-4"
          >
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-300 hover:text-neon-gold transition-colors duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}

              <div
                className="pt-4 border-t border-gray-700/50"
                data-auth-button
              >
                <AuthButtons />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
