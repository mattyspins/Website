"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Coins, Trophy, Wallet, Clock, Check,
  Shield, Star, UserCheck, Ban, TrendingUp, ShoppingCart
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface UserDetail {
  id: string;
  displayName: string;
  avatarUrl?: string;
  discordId: string;
  kickUsername?: string;
  kickVerified: boolean;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  weeklyWagered: string;
  monthlyWagered: string;
  points: number;
  totalEarned: number;
  totalSpent: number;
  totalWagered: string;
  totalDeposited: string;
  totalWatchMinutes: number;
  firstWatchedAt: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  isVip: boolean;
  isDepositor: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastActiveAt: string;
  pointTransactions: Array<{
    id: string; amount: number; transactionType: string;
    reason?: string; createdAt: string;
  }>;
}

function fmt(minutes: number) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AdminUserPage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Coins
  const [coinsAmount, setCoinsAmount] = useState("");
  const [coinsOp, setCoinsOp] = useState<"add" | "remove">("add");
  const [coinsReason, setCoinsReason] = useState("");
  const [coinsSaving, setCoinsSaving] = useState(false);
  const [coinsMsg, setCoinsMsg] = useState("");

  // Wager / deposit
  const [newWager, setNewWager] = useState("");
  const [newDeposited, setNewDeposited] = useState("");
  const [wagerSaving, setWagerSaving] = useState(false);
  const [wagerMsg, setWagerMsg] = useState("");

  // Suspend
  const [suspendSaving, setSuspendSaving] = useState(false);

  const { success, error: toastError } = useToast();
  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) { router.push("/"); return; }
    fetch(API_ENDPOINTS.ADMIN_USER(userId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then((d) => {
        if (!d) return;
        const u = d.data ?? d.user ?? d;
        setUser(u);
        setNewWager(String(Number(u.totalWagered ?? 0)));
        setNewDeposited(String(Number(u.totalDeposited ?? 0)));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleRole = async (field: string, current: boolean) => {
    if (!user) return;
    const endpoint =
      field === "isModerator" ? API_ENDPOINTS.ADMIN_USER_MODERATOR(user.id)
      : field === "isVip"     ? API_ENDPOINTS.ADMIN_USER_VIP(user.id)
      : API_ENDPOINTS.ADMIN_USER_DEPOSITOR(user.id);
    const body = field === "isModerator" ? { isModerator: !current }
      : field === "isVip"    ? { isVip: !current }
      : { isDepositor: !current };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) setUser((u) => u ? { ...u, [field]: !current } : u);
  };

  const handleCoins = async () => {
    if (!user || !coinsAmount || !coinsReason.trim()) return;
    setCoinsSaving(true); setCoinsMsg("");
    const amount = coinsOp === "add" ? Math.abs(Number(coinsAmount)) : -Math.abs(Number(coinsAmount));
    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_USER_POINTS(user.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ amount, reason: coinsReason }),
      });
      if (res.ok) {
        setUser((u) => u ? { ...u, points: u.points + amount } : u);
        setCoinsAmount(""); setCoinsReason("");
        setCoinsMsg(`✓ ${coinsOp === "add" ? "Added" : "Removed"} ${Math.abs(amount).toLocaleString()} coins`);
      } else { setCoinsMsg("Failed to update coins."); }
    } catch { setCoinsMsg("Network error."); } finally { setCoinsSaving(false); }
  };

  const handleWager = async () => {
    if (!user) return;
    setWagerSaving(true); setWagerMsg("");
    try {
      const results: string[] = [];
      if (parseFloat(newWager) !== Number(user.totalWagered)) {
        const r = await fetch(API_ENDPOINTS.ADMIN_USER_WAGER(user.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ totalWagered: parseFloat(newWager) }),
        });
        if (r.ok) { setUser((u) => u ? { ...u, totalWagered: newWager } : u); results.push("wagered"); }
      }
      if (parseFloat(newDeposited) !== Number(user.totalDeposited)) {
        const r = await fetch(API_ENDPOINTS.ADMIN_USER_DEPOSIT(user.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ totalDeposited: parseFloat(newDeposited) }),
        });
        if (r.ok) { setUser((u) => u ? { ...u, totalDeposited: newDeposited } : u); results.push("deposited"); }
      }
      setWagerMsg(results.length ? `✓ Updated ${results.join(" & ")}` : "No changes.");
    } catch { setWagerMsg("Network error."); } finally { setWagerSaving(false); }
  };

  const handleSuspend = async () => {
    if (!user) return;
    setSuspendSaving(true);
    const endpoint = user.isSuspended
      ? API_ENDPOINTS.ADMIN_USER_UNSUSPEND(user.id)
      : API_ENDPOINTS.ADMIN_USER_SUSPEND(user.id);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        setUser((u) => u ? { ...u, isSuspended: !u.isSuspended } : u);
        success(
          user.isSuspended ? "User unsuspended" : "User suspended",
          user.displayName
        );
      } else {
        toastError("Failed", "Could not update suspension status.");
      }
    } catch {
      toastError("Error", "Network error.");
    } finally {
      setSuspendSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-500/40 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !user) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg font-semibold mb-2">User not found</p>
        <button onClick={() => router.back()} className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors">← Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </button>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400 truncate">{user.displayName}</span>
        </div>

        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-navy-800/60 border border-white/6 rounded-2xl p-6 mb-5">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-400 flex items-center justify-center shrink-0 overflow-hidden ring-4 ring-yellow-500/20">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-black text-3xl">{user.displayName.charAt(0).toUpperCase()}</span>
              }
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-black text-2xl mb-1">{user.displayName}</h1>
              <p className="text-gray-500 text-sm mb-3">{user.discordId}</p>
              <div className="flex flex-wrap gap-1.5">
                {user.isAdmin     && <span className="bg-yellow-500 text-black text-xs px-2.5 py-0.5 rounded-full font-black">ADMIN</span>}
                {user.isModerator && <span className="bg-blue-500 text-white text-xs px-2.5 py-0.5 rounded-full font-black">MODERATOR</span>}
                {user.isVip       && <span className="bg-yellow-500 text-white text-xs px-2.5 py-0.5 rounded-full font-black">VIP</span>}
                {user.isDepositor && <span className="bg-green-600 text-white text-xs px-2.5 py-0.5 rounded-full font-black">DEPOSITOR</span>}
                {user.isSuspended && <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-black">SUSPENDED</span>}
              </div>
            </div>

            {/* Quick info */}
            <div className="flex flex-col gap-1 text-sm shrink-0">
              <p className="text-gray-500">Joined <span className="text-white font-semibold">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></p>
              <p className="text-gray-500">Last active <span className="text-white font-semibold">{new Date(user.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT: stats + accounts + transactions */}
          <div className="lg:col-span-2 space-y-5">

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: <Coins className="w-5 h-5 text-yellow-400" />,       label: "Balance",     value: user.points.toLocaleString(),                     bg: "bg-yellow-500/10" },
                { icon: <TrendingUp className="w-5 h-5 text-green-400" />,   label: "Total Earned", value: (user.totalEarned ?? 0).toLocaleString(),          bg: "bg-green-500/10" },
                { icon: <ShoppingCart className="w-5 h-5 text-orange-400" />,label: "Total Spent",  value: (user.totalSpent ?? 0).toLocaleString(),           bg: "bg-orange-500/10" },
                { icon: <Trophy className="w-5 h-5 text-gold-400" />,        label: "Wagered",      value: `$${Number(user.totalWagered).toLocaleString()}`,  bg: "bg-gold-500/10" },
                { icon: <Wallet className="w-5 h-5 text-blue-400" />,        label: "Deposited",    value: `$${Number(user.totalDeposited).toLocaleString()}`,bg: "bg-blue-500/10" },
                { icon: <Clock className="w-5 h-5 text-teal-400" />,         label: "Watch Time",   value: fmt(user.totalWatchMinutes),                       bg: "bg-teal-500/10" },
              ].map(({ icon, label, value, bg }) => (
                <div key={label} className={`${bg} border border-white/6 rounded-2xl p-4 flex flex-col gap-2`}>
                  <div className="flex items-center gap-2">
                    {icon}
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">{label}</p>
                  </div>
                  <p className="text-white font-black text-xl">{value}</p>
                  {label === "Watch Time" && user.firstWatchedAt && (
                    <p className="text-gray-600 text-[10px]">Since {new Date(user.firstWatchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  )}
                </div>
              ))}
            </motion.div>

            {/* Accounts */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-5">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Linked Accounts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kick */}
                <div className={`rounded-xl p-4 border ${user.kickVerified ? "bg-[#53FC18]/5 border-[#53FC18]/20" : user.kickUsername ? "bg-yellow-500/5 border-yellow-500/20" : "bg-white/3 border-white/6"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-[#53FC18] rounded-sm flex items-center justify-center shrink-0">
                      <span className="text-black text-[9px] font-black">K</span>
                    </div>
                    <p className="text-white text-sm font-semibold">Kick</p>
                    {user.kickVerified && <span className="text-[#53FC18] text-[10px] font-black ml-auto">VERIFIED</span>}
                    {user.kickUsername && !user.kickVerified && <span className="text-yellow-400 text-[10px] font-black ml-auto">PENDING</span>}
                  </div>
                  <p className={`text-sm ${user.kickUsername ? "text-gray-300" : "text-gray-600"}`}>
                    {user.kickUsername || "Not linked"}
                  </p>
                </div>

                {/* Razed */}
                <div className={`rounded-xl p-4 border ${user.rainbetVerified ? "bg-gold-500/5 border-gold-500/20" : user.rainbetUsername ? "bg-yellow-500/5 border-yellow-500/20" : "bg-white/3 border-white/6"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gold-400 font-black text-sm">R</span>
                    <p className="text-white text-sm font-semibold">Razed</p>
                    {user.rainbetVerified && <span className="text-gold-400 text-[10px] font-black ml-auto">VERIFIED</span>}
                    {user.rainbetUsername && !user.rainbetVerified && <span className="text-yellow-400 text-[10px] font-black ml-auto">PENDING</span>}
                  </div>
                  <p className={`text-sm ${user.rainbetUsername ? "text-gray-300" : "text-gray-600"}`}>
                    {user.rainbetUsername || "Not linked"}
                  </p>
                  {user.rainbetUsername && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/6">
                      <div>
                        <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-0.5">Weekly</p>
                        <p className="text-gray-200 text-sm font-semibold">${Number(user.weeklyWagered).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-0.5">Monthly</p>
                        <p className="text-gray-200 text-sm font-semibold">${Number(user.monthlyWagered).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-0.5">Lifetime</p>
                        <p className="text-gold-400 text-sm font-semibold">${Number(user.totalWagered).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Recent transactions */}
            {user.pointTransactions?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-navy-800/60 border border-white/6 rounded-2xl p-5">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Recent Transactions</h2>
                <div className="space-y-1">
                  {user.pointTransactions.slice(0, 15).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/4 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-300 text-sm truncate">{tx.reason || tx.transactionType}</p>
                        <p className="text-gray-600 text-xs">{new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      <span className={`font-bold text-sm shrink-0 ml-4 ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT: admin controls */}
          <div className="space-y-5">

            {/* Roles */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-5">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4">Roles</h2>
              <div className="space-y-2">
                {!user.isAdmin && (
                  <RoleToggle label="Moderator" icon={<Shield className="w-3.5 h-3.5" />} active={user.isModerator} color="blue" onToggle={() => toggleRole("isModerator", user.isModerator)} />
                )}
                <RoleToggle label="VIP" icon={<Star className="w-3.5 h-3.5" />} active={user.isVip} color="yellow" onToggle={() => toggleRole("isVip", user.isVip)} />
                <RoleToggle label="Depositor" icon={<UserCheck className="w-3.5 h-3.5" />} active={user.isDepositor} color="green" onToggle={() => toggleRole("isDepositor", user.isDepositor)} />
              </div>
            </motion.div>

            {/* Adjust coins */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-5 space-y-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">Adjust Coins</h2>
              <p className="text-gray-500 text-xs">Current balance: <span className="text-white font-semibold">{user.points.toLocaleString()}</span></p>
              <div className="flex rounded-xl overflow-hidden border border-white/8">
                <button onClick={() => setCoinsOp("add")} className={`flex-1 py-2 text-xs font-bold transition-colors ${coinsOp === "add" ? "bg-green-600 text-white" : "bg-black/30 text-gray-400"}`}>+ Add</button>
                <button onClick={() => setCoinsOp("remove")} className={`flex-1 py-2 text-xs font-bold transition-colors ${coinsOp === "remove" ? "bg-red-600 text-white" : "bg-black/30 text-gray-400"}`}>− Remove</button>
              </div>
              <input type="number" min="1" value={coinsAmount} onChange={(e) => setCoinsAmount(e.target.value)}
                placeholder="Amount" className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/40" />
              <input type="text" value={coinsReason} onChange={(e) => setCoinsReason(e.target.value)}
                placeholder="Reason (required)" className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/40" />
              <button onClick={handleCoins} disabled={coinsSaving || !coinsAmount || !coinsReason.trim()}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {coinsSaving ? "Saving…" : "Apply"}
              </button>
              {coinsMsg && <p className={`text-xs font-medium ${coinsMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{coinsMsg}</p>}
            </motion.div>

            {/* Wager & Deposit */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
              className="bg-navy-800/60 border border-white/6 rounded-2xl p-5 space-y-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">Wager & Deposit</h2>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Total Wagered ($)</label>
                <input type="number" min="0" step="0.01" value={newWager} onChange={(e) => setNewWager(e.target.value)}
                  className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/30" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Total Deposited ($)</label>
                <input type="number" min="0" step="0.01" value={newDeposited} onChange={(e) => setNewDeposited(e.target.value)}
                  className="w-full bg-navy-900/60 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/30" />
              </div>
              <button onClick={handleWager} disabled={wagerSaving}
                className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {wagerSaving ? "Saving…" : "Update"}
              </button>
              {wagerMsg && <p className={`text-xs font-medium ${wagerMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{wagerMsg}</p>}
            </motion.div>

            {/* Suspend / Unsuspend */}
            {!user.isAdmin && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
                className="bg-navy-800/60 border border-white/6 rounded-2xl p-5 space-y-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-widest">Account</h2>
                <p className="text-gray-500 text-xs">
                  {user.isSuspended
                    ? "This account is currently suspended. Users cannot log in while suspended."
                    : "Suspending will immediately invalidate all sessions."}
                </p>
                <button
                  onClick={handleSuspend}
                  disabled={suspendSaving}
                  className={`w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40 ${
                    user.isSuspended
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 hover:border-red-600"
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {suspendSaving ? "Saving…" : user.isSuspended ? "Unsuspend Account" : "Suspend Account"}
                </button>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function RoleToggle({ label, icon, active, color, onToggle }: { label: string; icon: React.ReactNode; active: boolean; color: string; onToggle: () => void }) {
  const colors: Record<string, { on: string; off: string }> = {
    blue:   { on: "bg-blue-600 border-blue-500 text-white",     off: "bg-white/3 border-white/8 text-gray-400 hover:border-white/20" },
    yellow: { on: "bg-yellow-600 border-yellow-500 text-white", off: "bg-white/3 border-white/8 text-gray-400 hover:border-white/20" },
    green:  { on: "bg-green-600 border-green-500 text-white",   off: "bg-white/3 border-white/8 text-gray-400 hover:border-white/20" },
  };
  return (
    <button onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${active ? colors[color].on : colors[color].off}`}>
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? "border-white bg-white/20" : "border-current opacity-30"}`}>
        {active && <Check className="w-3 h-3" />}
      </span>
    </button>
  );
}
