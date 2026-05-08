"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import LiveStatus from "@/components/LiveStatus";
import StreamSchedule from "@/components/StreamSchedule";
import RecentHighlights from "@/components/RecentHighlights";
import SocialLinks from "@/components/SocialLinks";

export default function Home() {
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info">("info");

  useEffect(() => {
    const loginRequired = searchParams.get("login");
    const error = searchParams.get("error");

    if (loginRequired === "required") {
      setMessage("Please login with Discord to access this page");
      setMessageType("info");
      setShowMessage(true);
    } else if (error === "admin_required") {
      setMessage("Admin access required");
      setMessageType("error");
      setShowMessage(true);
    } else if (error === "moderator_required") {
      setMessage("Moderator access required");
      setMessageType("error");
      setShowMessage(true);
    }

    if (showMessage) {
      setTimeout(() => setShowMessage(false), 5000);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-lg ${
            messageType === "error"
              ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          <p className="font-semibold">{message}</p>
        </motion.div>
      )}

      <Hero />

      {/* Feature Highlights Section */}
      <motion.section
        className="py-16 px-4 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            Why Join MattySpins?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-xl p-6 text-center hover:border-purple-400/50 transition-all hover:scale-105"
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Guess the Balance
              </h3>
              <p className="text-gray-300 text-sm">
                Predict bonus hunt outcomes and win points for accurate guesses
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 rounded-xl p-6 text-center hover:border-yellow-400/50 transition-all hover:scale-105"
            >
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Leaderboards
              </h3>
              <p className="text-gray-300 text-sm">
                Compete in tournaments and climb the ranks to win prizes
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/30 rounded-xl p-6 text-center hover:border-green-400/50 transition-all hover:scale-105"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🛒</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Points Store
              </h3>
              <p className="text-gray-300 text-sm">
                Earn points and redeem them for exclusive rewards and prizes
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 rounded-xl p-6 text-center hover:border-blue-400/50 transition-all hover:scale-105"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎁</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Raffles & Giveaways
              </h3>
              <p className="text-gray-300 text-sm">
                Enter raffles and participate in exclusive community giveaways
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Get Started Section */}
      <motion.section
        className="py-16 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of players in the MattySpins community. Login with
              Discord to start earning points and competing!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .querySelector("[data-auth-button]")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
              >
                🚀 Login & Start Playing
              </a>
              <a
                href="/bonus-hunt"
                className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all"
              >
                🎯 View Active Games
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto">
          <LiveStatus />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-16">
            <RecentHighlights />
            <StreamSchedule />
          </div>

          <SocialLinks />
        </div>
      </motion.section>
    </div>
  );
}
