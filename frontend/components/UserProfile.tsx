"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, User, ShoppingBag, LayoutDashboard, LogOut } from "lucide-react";

interface UserProfileProps {
  user: {
    id: string;
    displayName: string;
    avatar?: string;
    points: number;
    isAdmin: boolean;
    isModerator: boolean;
    kickUsername?: string;
  };
  onLogout: () => void;
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-navy-700/60 hover:bg-navy-700 border border-gold-500/15 hover:border-gold-500/30 text-white px-3 py-1.5 rounded-lg transition-all duration-200"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center overflow-hidden shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-xs">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold truncate max-w-[120px]">{user.displayName}</span>
          <span className="text-xs text-gold-400 font-medium">
            {user.points.toLocaleString()} coins
          </span>
        </div>

        {(user.isAdmin || user.isModerator) && (
          <span className={`hidden md:inline text-xs px-1.5 py-0.5 rounded font-bold ${
            user.isAdmin ? "bg-gold-500/20 text-gold-400 border border-gold-500/30" : "bg-gold-500/20 text-gold-400 border border-gold-500/30"
          }`}>
            {user.isAdmin ? "ADMIN" : "MOD"}
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 max-w-[90vw] bg-navy-800/95 backdrop-blur-xl border border-gold-500/15 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold">{user.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{user.displayName}</p>
                  <p className="text-gold-400 text-xs font-medium">{user.points.toLocaleString()} coins</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="px-3 pb-2 space-y-0.5">
              <a href="/profile" className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <User className="w-4 h-4 shrink-0" />
                My Profile
              </a>
              <a href="/profile/purchases" className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                Purchase History
              </a>

              {user.isAdmin && (
                <a href="/admin" className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  Admin Dashboard
                </a>
              )}
              {user.isModerator && !user.isAdmin && (
                <a href="/moderator" className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  Moderator Panel
                </a>
              )}

              <div className="border-t border-white/5 pt-1 mt-1">
                <button
                  onClick={() => { setIsOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/8 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Log Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
