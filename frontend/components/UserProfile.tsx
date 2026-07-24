"use client";

import Link from "next/link";
import { Coins, LogOut } from "lucide-react";

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
  return (
    <div className="flex items-center gap-2">
      {/* Coin balance */}
      <div className="flex items-center gap-1.5 bg-navy-700/60 border border-gold-500/15 text-gold-400 px-3 py-1.5 rounded-full text-sm font-semibold">
        <Coins className="w-4 h-4 shrink-0" />
        {user.points.toLocaleString()}
      </div>

      {/* Avatar + name — links straight to the profile page instead of opening a dropdown */}
      <Link
        href="/profile"
        className="flex items-center gap-2 bg-navy-700/60 hover:bg-navy-700 border border-gold-500/15 hover:border-gold-500/30 text-white pl-1.5 pr-3 py-1.5 rounded-full transition-all duration-200"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center overflow-hidden shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-[10px]">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="hidden md:inline text-sm font-semibold truncate max-w-[120px]">
          {user.displayName}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
      </Link>

      {(user.isAdmin || user.isModerator) && (
        <Link
          href={user.isAdmin ? "/admin" : "/moderator"}
          className="hidden md:inline text-xs px-2 py-1.5 rounded-full font-bold bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/30 transition-colors"
        >
          {user.isAdmin ? "ADMIN" : "MOD"}
        </Link>
      )}

      <button
        onClick={onLogout}
        aria-label="Log out"
        className="w-9 h-9 flex items-center justify-center rounded-full bg-navy-700/60 hover:bg-red-500/10 border border-gold-500/15 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all duration-200 shrink-0"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
