"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

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
  onKickVerification: () => void;
}

export default function UserProfile({
  user,
  onLogout,
  onKickVerification,
}: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold border border-purple-400/30"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-sm">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Username and Points */}
        <div className="hidden md:flex flex-col items-start min-w-0 flex-1 mr-2">
          <span className="text-sm font-semibold truncate max-w-full">
            {user.displayName}
          </span>
          <span className="text-xs text-purple-200">
            {user.points.toLocaleString()} points
          </span>
        </div>

        {/* Admin Badge */}
        {user.isAdmin && (
          <span className="hidden md:inline-block bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
            ADMIN
          </span>
        )}

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 bg-black/95 backdrop-blur-lg border border-purple-500/30 rounded-lg shadow-2xl overflow-hidden z-50"
          >
            {/* User Info Section */}
            <div className="p-4 border-b border-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {user.displayName}
                  </p>
                  <p className="text-purple-300 text-sm">
                    {user.points.toLocaleString()} points
                  </p>
                  {user.isAdmin && (
                    <span className="inline-block bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold mt-1">
                      ADMIN
                    </span>
                  )}
                  {user.isModerator && !user.isAdmin && (
                    <span className="inline-block bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold mt-1">
                      MOD
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Kick Verification Status */}
              {user.kickUsername ? (
                <div className="px-4 py-2 text-sm">
                  <div className="flex items-center space-x-2 text-green-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Kick: {user.kickUsername}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onKickVerification();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600/20 transition-colors flex items-center space-x-2"
                >
                  <div className="w-5 h-5 bg-[#53FC18] rounded-sm flex items-center justify-center">
                    <span className="text-black text-xs font-bold">K</span>
                  </div>
                  <span>Verify Kick Account</span>
                </button>
              )}

              {/* Dashboard Link (Admin Only) */}
              {user.isAdmin && (
                <>
                  <a
                    href="/admin"
                    className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600/20 transition-colors flex items-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span>Admin Dashboard</span>
                  </a>
                  <a
                    href="/admin/audit-logs"
                    className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600/20 transition-colors flex items-center space-x-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Audit Logs</span>
                  </a>
                </>
              )}

              {/* Moderator Dashboard (Moderator Only) */}
              {user.isModerator && !user.isAdmin && (
                <a
                  href="/moderator"
                  className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-blue-600/20 transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span>Moderator Dashboard</span>
                </a>
              )}

              {/* Profile Link */}
              <a
                href="/profile"
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600/20 transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>My Profile</span>
              </a>

              {/* Divider */}
              <div className="border-t border-purple-500/20 my-2"></div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-600/20 transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
