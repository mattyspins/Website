"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import UserProfile from "./UserProfile";
import { useToast } from "./ui/ToastProvider";
import { API_ENDPOINTS } from "@/lib/api";

interface User {
  id: string;
  displayName: string;
  avatar?: string;
  points: number;
  isAdmin: boolean;
  isModerator: boolean;
  kickUsername?: string;
}

export default function AuthButtons() {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showKickModal, setShowKickModal] = useState(false);
  const { success, error, info } = useToast();

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkAuth = async () => {
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
            // Update localStorage with complete user info including points
            localStorage.setItem("user_info", JSON.stringify(data.user));
          }
        } else {
          // Token invalid, clear it
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };

    checkAuth();
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
    } catch (error) {
      console.error("Discord login error:", error);
      error(
        "Connection Error",
        "Failed to connect to authentication server. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickLogin = () => {
    // Kick login will be implemented after Discord auth
    info(
      "Coming Soon",
      "Kick login coming soon! Please login with Discord first.",
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
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    // Clear local storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);

    // Redirect to home
    window.location.href = "/";
  };

  const handleKickVerification = () => {
    setShowKickModal(true);
  };

  // If user is logged in, show profile dropdown
  if (user) {
    return (
      <>
        <UserProfile
          user={user}
          onLogout={handleLogout}
          onKickVerification={handleKickVerification}
        />

        {/* Kick Verification Modal */}
        {showKickModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-4">
                Verify Kick Account
              </h3>
              <p className="text-gray-300 mb-4">
                Enter your Kick username to link your account and start earning
                points for watching streams!
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const kickUsername = formData.get("kickUsername") as string;

                  try {
                    const accessToken = localStorage.getItem("access_token");
                    const response = await fetch(
                      API_ENDPOINTS.AUTH_KICK_VERIFY,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({ kickUsername }),
                      },
                    );

                    const data = await response.json();

                    if (response.ok && data.success) {
                      success(
                        "Verification Successful",
                        "Kick account verified successfully!",
                      );
                      const updatedUser = {
                        ...user,
                        kickUsername: data.user.kickUsername,
                      };
                      setUser(updatedUser);
                      // Update localStorage with the updated user info
                      localStorage.setItem(
                        "user_info",
                        JSON.stringify(updatedUser),
                      );
                      setShowKickModal(false);
                    } else {
                      error(
                        "Verification Failed",
                        data.error?.message ||
                          "Verification failed. Please try again.",
                      );
                    }
                  } catch (error) {
                    console.error("Kick verification error:", error);
                    error(
                      "Verification Error",
                      "Failed to verify Kick account. Please try again.",
                    );
                  }
                }}
              >
                <input
                  type="text"
                  name="kickUsername"
                  placeholder="Enter your Kick username"
                  className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
                  required
                />

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#53FC18] hover:bg-[#45D615] text-black font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKickModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </>
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
