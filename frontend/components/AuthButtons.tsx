"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import UserProfile from "./UserProfile";
import { useToast } from "./ui/ToastProvider";
import { API_ENDPOINTS } from "@/lib/api";
import { User, ShoppingBag, LayoutDashboard, LogOut } from "lucide-react";
import {
  storeAuthData,
  getStoredUser,
  initializeAuth,
  clearAuthData,
  updateStoredUser,
} from "@/lib/authPersistence";

interface UserData {
  id: string;
  displayName: string;
  avatar?: string;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  kickUsername?: string;
}

interface AuthButtonsProps {
  inline?: boolean;
  onNavigate?: () => void;
}

export default function AuthButtons({ inline = false, onNavigate }: AuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const { error, info } = useToast();

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkAuth = async () => {
      // Try to initialize auth from stored tokens
      const storedUser = await initializeAuth();

      if (storedUser) {
        setUser(storedUser);
        return;
      }

      // Fallback: check with backend if we have a token
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) return;

      try {
        const response = await fetch(API_ENDPOINTS.AUTH_ME, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            updateStoredUser(data.user);
          }
        } else {
          clearAuthData();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };

    checkAuth();

    const refreshBalance = async () => {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) return;
      try {
        const response = await fetch(API_ENDPOINTS.AUTH_ME, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            updateStoredUser(data.user);
          }
        }
      } catch {}
    };

    // Poll every 10 seconds
    const interval = setInterval(refreshBalance, 10_000);

    // Refresh immediately when the user returns to this tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshBalance();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Allow other components to trigger an immediate refresh
    // (e.g. after a store purchase deducts coins)
    window.addEventListener("coins-updated", refreshBalance);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("coins-updated", refreshBalance);
    };
  }, []);

  const handleDiscordLogin = async () => {
    try {
      setIsLoading(true);
      // Call backend to get Discord OAuth URL
      const response = await fetch(API_ENDPOINTS.AUTH_DISCORD_INITIATE, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to initiate Discord login");
      }

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to Discord OAuth
        window.location.href = data.authUrl;
      } else {
        console.error("Invalid response from server:", data);
        error(
          "Login Failed",
          "Failed to start Discord login. Please try again.",
        );
      }
    } catch (err) {
      console.error("Discord login error:", err);
      error(
        "Connection Error",
        "Failed to connect to authentication server. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickLogin = () => {
    info(
      "Login Required",
      "Please login with Discord first, then link your Kick account in your profile.",
    );
  };

  const handleLogout = async () => {
    const accessToken = localStorage.getItem("access_token");

    if (accessToken) {
      try {
        await fetch(API_ENDPOINTS.AUTH_LOGOUT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }

    // Clear all auth data using the persistence module
    clearAuthData();
    setUser(null);

    // Redirect to home
    window.location.href = "/";
  };

  // ── Inline mode (mobile sidebar) ──────────────────────────────────────
  if (inline) {
    if (user) {
      return (
        <div className="border-t border-white/5 pt-3 mt-1">
          {/* User header */}
          <div className="flex items-center gap-3 px-4 py-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center overflow-hidden shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{user.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">{user.displayName}</p>
              <p className="text-gold-400 text-xs font-medium">{user.points.toLocaleString()} coins</p>
            </div>
            {(user.isAdmin || user.isModerator) && (
              <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-gold-500/20 text-gold-400 border border-gold-500/30 shrink-0">
                {user.isAdmin ? "ADMIN" : "MOD"}
              </span>
            )}
          </div>

          {/* Nav links */}
          <a href="/profile" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <User className="w-4 h-4 shrink-0" />
            My Profile
          </a>
          <a href="/profile/purchases" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            Purchase History
          </a>
          {user.isAdmin && (
            <a href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Admin Dashboard
            </a>
          )}
          {user.isModerator && !user.isAdmin && (
            <a href="/moderator" onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Moderator Panel
            </a>
          )}
          <div className="border-t border-white/5 mt-1 pt-1">
            <button
              onClick={() => { onNavigate?.(); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/8 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Log Out
            </button>
          </div>
        </div>
      );
    }

    // Not logged in — show Discord login button full-width
    return (
      <div className="border-t border-white/5 pt-3 mt-1 px-1">
        <button
          onClick={handleDiscordLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2.5 rounded-lg transition-all font-semibold text-sm disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          )}
          {isLoading ? "Connecting..." : "Login with Discord"}
        </button>
      </div>
    );
  }

  // ── Dropdown mode (desktop) ────────────────────────────────────────────
  if (user) {
    return (
      <UserProfile
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // If not logged in, show login buttons
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleDiscordLogin}
        disabled={isLoading}
        className="btn-glow flex items-center space-x-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord</span>
          </>
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleKickLogin}
        className="btn-glow flex items-center space-x-2 bg-[#53FC18] hover:bg-[#45D615] text-black px-4 py-2 rounded-lg transition-all duration-300 font-semibold"
      >
        <div className="w-5 h-5 bg-black rounded-sm flex items-center justify-center">
          <span className="text-[#53FC18] text-xs font-bold">K</span>
        </div>
        <span>Kick</span>
      </motion.button>
    </div>
  );
}
