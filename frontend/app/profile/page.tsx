"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

interface User {
  id: string;
  displayName: string;
  avatar?: string;
  points: number;
  discordUsername?: string;
  kickUsername?: string;
  kickVerified?: boolean;
  acebetUsername?: string;
  createdAt?: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Kick verification state
  const [kickStep, setKickStep] = useState<"idle" | "polling">("idle");
  const [kickUsernameInput, setKickUsernameInput] = useState("");
  const [kickVerifyCode, setKickVerifyCode] = useState("");
  const [kickLoading, setKickLoading] = useState(false);
  const [kickError, setKickError] = useState("");
  const [kickPollingRef, setKickPollingRef] = useState<ReturnType<typeof setInterval> | null>(null);

  // AceBet state
  const [acebetInput, setAcebetInput] = useState("");
  const [acebetSaving, setAcebetSaving] = useState(false);
  const [acebetMsg, setAcebetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
    return () => { if (kickPollingRef) clearInterval(kickPollingRef); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/?login=required"); return; }
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
      try {
        const txRes = await fetch("/api/users/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData.transactions || []);
        }
      } catch { /* transactions endpoint may not exist yet */ }
    } catch {
      router.push("/?login=required");
    } finally {
      setLoading(false);
    }
  };

  const handleKickVerifyWithUsername = async (username: string) => {
    setKickLoading(true);
    setKickError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(API_ENDPOINTS.KICK_VERIFY_INITIATE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kickUsername: username }),
      });
      const data = await res.json();
      if (res.ok && data.alreadyVerified) {
        setUser((u) => u ? { ...u, kickUsername: data.kickUsername || u.kickUsername, kickVerified: true } : u);
      } else if (res.ok && data.code) {
        setKickVerifyCode(data.code);
        setKickStep("polling");
        const interval = setInterval(async () => {
          try {
            const t = localStorage.getItem("access_token");
            const r = await fetch(API_ENDPOINTS.KICK_VERIFY_STATUS, { headers: { Authorization: `Bearer ${t}` } });
            const d = await r.json();
            if (d.verified) {
              clearInterval(interval);
              setKickPollingRef(null);
              setKickStep("idle");
              setKickVerifyCode("");
              setUser((u) => u ? { ...u, kickUsername: d.kickUsername || u.kickUsername, kickVerified: true } : u);
            }
          } catch { /* ignore */ }
        }, 3000);
        setKickPollingRef(interval);
      } else {
        const errMsg = typeof data.error === "string" ? data.error : data.error?.message;
        setKickError(errMsg || data.message || "Failed to generate code. Try again.");
      }
    } catch {
      setKickError("Connection error. Please try again.");
    } finally {
      setKickLoading(false);
    }
  };

  const handleKickVerifyStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kickUsernameInput.trim()) return;
    setKickLoading(true);
    setKickError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(API_ENDPOINTS.KICK_VERIFY_INITIATE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kickUsername: kickUsernameInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.alreadyVerified) {
        // Already verified in DB — update local state and reload profile
        setUser((u) => u ? { ...u, kickUsername: data.kickUsername || u.kickUsername, kickVerified: true } : u);
        setKickUsernameInput("");
      } else if (res.ok && data.code) {
        setKickVerifyCode(data.code);
        setKickStep("polling");
        const interval = setInterval(async () => {
          try {
            const t = localStorage.getItem("access_token");
            const r = await fetch(API_ENDPOINTS.KICK_VERIFY_STATUS, {
              headers: { Authorization: `Bearer ${t}` },
            });
            const d = await r.json();
            if (d.verified) {
              clearInterval(interval);
              setKickPollingRef(null);
              setKickStep("idle");
              setKickVerifyCode("");
              setKickUsernameInput("");
              setUser((u) => u ? { ...u, kickUsername: d.kickUsername || u.kickUsername, kickVerified: true } : u);
            }
          } catch { /* ignore */ }
        }, 3000);
        setKickPollingRef(interval);
      } else {
        const errMsg = typeof data.error === "string" ? data.error : data.error?.message;
        setKickError(errMsg || data.message || "Failed to generate code. Try again.");
      }
    } catch {
      setKickError("Connection error. Please try again.");
    } finally {
      setKickLoading(false);
    }
  };

  const handleKickCancel = () => {
    if (kickPollingRef) clearInterval(kickPollingRef);
    setKickPollingRef(null);
    setKickStep("idle");
    setKickVerifyCode("");
    setKickError("");
  };

  const handleUnlinkKick = async () => {
    if (!confirm("Unlink your Kick account?")) return;
    try {
      const token = localStorage.getItem("access_token");
      await fetch(API_ENDPOINTS.KICK_OAUTH_UNLINK, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser((u) => u ? { ...u, kickUsername: undefined, kickVerified: false } : u);
    } catch {
      setKickError("Failed to unlink. Please try again.");
    }
  };

  const handleAcebetSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acebetInput.trim()) return;
    setAcebetSaving(true);
    setAcebetMsg(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/rainbet-username`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rainbetUsername: acebetInput.trim() }),
        }
      );
      if (res.ok) {
        setAcebetMsg({ type: "success", text: "AceBet username submitted. Pending admin verification." });
        setUser((u) => u ? { ...u, acebetUsername: acebetInput.trim() } : u);
        setAcebetInput("");
      } else {
        const d = await res.json().catch(() => ({}));
        setAcebetMsg({ type: "error", text: d.error?.message || "Failed to save. Please try again." });
      }
    } catch {
      setAcebetMsg({ type: "success", text: "AceBet username submitted. Pending admin verification." });
      setUser((u) => u ? { ...u, acebetUsername: acebetInput.trim() } : u);
      setAcebetInput("");
    } finally {
      setAcebetSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-6 w-24 bg-navy-700 rounded animate-pulse" />
          <div className="h-10 w-48 bg-navy-700 rounded animate-pulse" />
          <div className="bg-navy-800/60 border border-white/5 rounded-xl p-6 h-40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const kickVerified = user.kickVerified && user.kickUsername;
  const kickPending = !kickVerified && !!user.kickUsername;
  const showKickBanner = !kickVerified && !bannerDismissed;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block bg-navy-700/60 border border-white/8 text-gray-400 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded mb-4">
            Account
          </span>
          <h1 className="text-3xl font-bold text-white mb-6">Your Profile</h1>
        </motion.div>

        {/* Discord-linked banner */}
        <AnimatePresence>
          {showKickBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-navy-800/80 border border-blue-500/20 rounded-xl p-5 mb-4 flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4.5 h-4.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm mb-0.5">You're in! Discord linked.</p>
                <p className="text-gray-400 text-sm">
                  Your Discord is connected. Now link your Kick username below so you can earn coins from chat and show up on the leaderboard.
                </p>
                <button
                  onClick={() => {
                    document.getElementById("kick-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-3 inline-flex items-center gap-2 bg-[#53FC18] hover:bg-[#45D615] text-black text-xs font-bold px-4 py-2 rounded-lg transition-all uppercase tracking-wide"
                >
                  Connect Kick Account
                </button>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-gray-600 hover:text-gray-400 transition-colors shrink-0 text-sm"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-navy-800/60 border border-white/6 rounded-xl p-6 mb-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gold-600 to-gold-400 flex-shrink-0 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-xl font-bold mb-1 truncate">{user.displayName}</h2>
              {user.discordUsername && (
                <p className="text-gray-500 text-sm mb-0.5">
                  Discord <span className="text-gray-600 mx-1">·</span>
                  <span className="text-gray-400">{user.discordUsername}</span>
                </p>
              )}
              {user.kickUsername && (
                <p className="text-gray-500 text-sm mb-0.5 flex items-center gap-2">
                  Kick <span className="text-gray-600 mx-1">·</span>
                  <span className="text-gray-400">{user.kickUsername}</span>
                  {user.kickVerified && (
                    <span className="bg-[#53FC18]/15 text-[#53FC18] border border-[#53FC18]/25 text-xs font-semibold px-2 py-0.5 rounded">
                      VERIFIED
                    </span>
                  )}
                </p>
              )}
              {joinedDate && (
                <p className="text-gray-600 text-xs mt-1">Joined {joinedDate}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase mb-1">Coin Balance</p>
              <p className="text-white font-gaming font-bold text-3xl">{user.points.toLocaleString()}</p>
              <p className="text-gray-600 text-xs">{user.points.toLocaleString()} Lifetime</p>
            </div>
          </div>
        </motion.div>

        {/* Link Kick Account */}
        <motion.div
          id="kick-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-navy-800/60 border border-white/6 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-1 h-5 bg-[#53FC18] rounded-full" />
            <h3 className="text-white font-semibold">Link Your Kick Account</h3>
          </div>
          <p className="text-gray-500 text-sm mb-5 ml-3.5">
            Verify your Kick username to earn coins from chat and appear on the leaderboard.
          </p>

          {kickVerified ? (
            <div className="flex items-center gap-3 bg-[#53FC18]/8 border border-[#53FC18]/20 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-[#53FC18]/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#53FC18]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#53FC18] font-semibold text-sm">Kick account verified</p>
                <p className="text-gray-500 text-xs truncate">{user.kickUsername} · Earning coins for chat &amp; viewing</p>
              </div>
              <button onClick={handleUnlinkKick} className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0">
                Unlink
              </button>
            </div>
          ) : kickPending && kickStep === "idle" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-lg p-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-yellow-400 font-semibold text-sm">Kick username set — not yet verified</p>
                  <p className="text-gray-500 text-xs truncate">{user.kickUsername}</p>
                </div>
                <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 text-xs font-semibold px-2 py-0.5 rounded shrink-0">
                  PENDING
                </span>
              </div>
              <button
                onClick={() => handleKickVerifyWithUsername(user.kickUsername || "")}
                disabled={kickLoading}
                className="w-full bg-[#53FC18] hover:bg-[#45D615] disabled:opacity-40 text-black font-bold py-2.5 rounded-lg transition-all text-xs tracking-widest uppercase"
              >
                {kickLoading ? "..." : "Verify Now"}
              </button>
              {kickError && <p className="text-red-400 text-xs">{kickError}</p>}
            </div>
          ) : kickStep === "polling" ? (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                Go to{" "}
                <a
                  href="https://kick.com/mattyspinsslots"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#53FC18] hover:underline"
                >
                  kick.com/mattyspinsslots
                </a>{" "}
                and type this command in chat:{" "}
                <span className="font-mono text-[#53FC18]">!verify &lt;code&gt;</span>
              </p>
              <div
                className="relative bg-navy-900/80 border border-white/8 rounded-xl px-6 py-5 flex items-center justify-center cursor-pointer group"
                onClick={() => navigator.clipboard.writeText(`!verify ${kickVerifyCode}`)}
                title="Click to copy"
              >
                <span className="font-mono font-bold text-2xl tracking-[0.3em] text-[#53FC18]">
                  !verify {kickVerifyCode}
                </span>
                <span className="absolute right-3 top-3 text-gray-700 group-hover:text-gray-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
              <p className="text-gray-600 text-xs text-center">
                Listening for your message… Expires in 10 minutes.
              </p>
              <button
                onClick={handleKickCancel}
                className="text-gray-600 hover:text-gray-400 text-xs transition-colors w-full text-center pt-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <form onSubmit={handleKickVerifyStart}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={kickUsernameInput}
                  onChange={(e) => setKickUsernameInput(e.target.value)}
                  placeholder="Enter your Kick username"
                  className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#53FC18]/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={kickLoading || !kickUsernameInput.trim()}
                  className="bg-[#53FC18] hover:bg-[#45D615] disabled:opacity-40 text-black font-bold px-5 py-3 rounded-lg transition-all text-xs tracking-widest uppercase whitespace-nowrap w-full sm:w-auto"
                >
                  {kickLoading ? "..." : "Start Verification"}
                </button>
              </div>
              {kickError && <p className="text-red-400 text-xs mt-2">{kickError}</p>}
            </form>
          )}
        </motion.div>

        {/* Link AceBet Account */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-navy-800/60 border border-white/6 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-1 h-5 bg-gold-500 rounded-full" />
            <h3 className="text-white font-semibold">Link Your AceBet Account</h3>
          </div>
          <p className="text-gray-500 text-sm mb-5 ml-3.5">
            Verify your AceBet username to track your wager and claim leaderboard rewards.
          </p>

          {user.acebetUsername ? (
            <div className="flex items-center gap-3 bg-gold-500/8 border border-gold-500/20 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gold-400 font-semibold text-sm">AceBet account submitted</p>
                <p className="text-gray-500 text-xs truncate">{user.acebetUsername} · Pending admin verification</p>
              </div>
              <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 text-xs font-semibold px-2 py-0.5 rounded shrink-0">
                PENDING
              </span>
            </div>
          ) : (
            <form onSubmit={handleAcebetSave}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={acebetInput}
                  onChange={(e) => setAcebetInput(e.target.value)}
                  placeholder="Enter your AceBet username"
                  className="flex-1 bg-navy-900/60 border border-white/8 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gold-500/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={acebetSaving || !acebetInput.trim()}
                  className="w-full sm:w-auto bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-lg transition-all text-xs tracking-widest uppercase whitespace-nowrap"
                >
                  {acebetSaving ? "..." : "Start Verification"}
                </button>
              </div>
              {acebetMsg && (
                <p className={`text-xs mt-2 ${acebetMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                  {acebetMsg.text}
                </p>
              )}
            </form>
          )}
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-navy-800/60 border border-white/6 rounded-xl p-6"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-5 bg-gold-500 rounded-full" />
            <h3 className="text-white font-semibold">Transaction History</h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Nothing here yet.</p>
              <p className="text-gray-600 text-xs mt-1">
                Coins show up once you start earning from chat activity or games.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 border-b border-white/4 last:border-0"
                >
                  <div>
                    <p className="text-gray-300 text-sm">{tx.description}</p>
                    <p className="text-gray-600 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-semibold text-sm ${tx.amount >= 0 ? "text-prize" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
