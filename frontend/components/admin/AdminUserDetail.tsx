"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Trophy, Clock, Shield, Star, Wallet, Edit2, Check, ChevronUp, ChevronDown } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface UserDetail {
  id: string;
  displayName: string;
  avatarUrl?: string;
  discordId: string;
  kickUsername?: string;
  kickVerified: boolean;
  rainbetUsername?: string;
  rainbetVerified: boolean;
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

interface Props {
  userId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

function fmt(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AdminUserDetail({ userId, onClose, onRefresh }: Props) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit states
  const [coinsAmount, setCoinsAmount] = useState("");
  const [coinsOp, setCoinsOp] = useState<"add" | "remove">("add");
  const [coinsReason, setCoinsReason] = useState("");
  const [coinsSaving, setCoinsSaving] = useState(false);
  const [coinsMsg, setCoinsMsg] = useState("");

  const [newWager, setNewWager] = useState("");
  const [newDeposited, setNewDeposited] = useState("");
  const [wagerSaving, setWagerSaving] = useState(false);
  const [wagerMsg, setWagerMsg] = useState("");

  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    if (!userId) { setUser(null); return; }
    setLoading(true);
    setCoinsMsg(""); setWagerMsg("");
    fetch(API_ENDPOINTS.ADMIN_USER(userId), {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const u = d.data ?? d.user ?? d;
        setUser(u);
        setNewWager(String(Number(u.totalWagered ?? 0)));
        setNewDeposited(String(Number(u.totalDeposited ?? 0)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const toggleRole = async (field: string, current: boolean) => {
    if (!user) return;
    const endpoint =
      field === "isModerator" ? API_ENDPOINTS.ADMIN_USER_MODERATOR(user.id)
      : field === "isVip" ? API_ENDPOINTS.ADMIN_USER_VIP(user.id)
      : API_ENDPOINTS.ADMIN_USER_DEPOSITOR(user.id);
    const body = field === "isModerator" ? { isModerator: !current }
      : field === "isVip" ? { isVip: !current }
      : { isDepositor: !current };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setUser((u) => u ? { ...u, [field]: !current } : u);
      onRefresh();
    }
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
        onRefresh();
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

  return (
    <AnimatePresence>
      {userId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] z-50 flex flex-col bg-[#0d0f17] border-l border-white/8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loading || !user ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-5 pt-6 pb-5 border-b border-white/8 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-400 flex items-center justify-center shrink-0 overflow-hidden">
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-white font-bold text-lg">{user.displayName.charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-lg leading-tight">{user.displayName}</h2>
                        <p className="text-gray-400 text-xs mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Role badges */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {user.isAdmin    && <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black">ADMIN</span>}
                    {user.isModerator && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">MOD</span>}
                    {user.isVip      && <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">VIP</span>}
                    {user.isDepositor && <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">DEPOSITOR</span>}
                    {user.isSuspended && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">SUSPENDED</span>}
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Discord ID",    value: user.discordId },
                      { label: "Member Since",  value: new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                      { label: "Last Active",   value: new Date(user.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                      { label: "Kick",          value: user.kickUsername ? `${user.kickUsername}${user.kickVerified ? " ✓" : " (pending)"}` : "Not linked" },
                      { label: "Razed",         value: user.rainbetUsername ? `${user.rainbetUsername}${user.rainbetVerified ? " ✓" : " (pending)"}` : "Not linked" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-navy-800/60 border border-white/6 rounded-xl px-4 py-3">
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-white text-xs font-semibold break-all">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-navy-800/60 border border-white/6 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Coins className="w-5 h-5 text-yellow-400 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest">Coins</p>
                        <p className="text-white font-bold">{user.points.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-navy-800/60 border border-white/6 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-gold-400 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest">Wagered</p>
                        <p className="text-white font-bold">${Number(user.totalWagered).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-navy-800/60 border border-white/6 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest">Deposited</p>
                        <p className="text-white font-bold">${Number(user.totalDeposited).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-navy-800/60 border border-white/6 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-green-400 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest">Watch Time</p>
                        <p className="text-white font-bold">{user.totalWatchMinutes > 0 ? fmt(user.totalWatchMinutes) : "—"}</p>
                        {user.firstWatchedAt && (
                          <p className="text-gray-400 text-[10px] mt-0.5">
                            Since {new Date(user.firstWatchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role toggles */}
                  <div className="bg-navy-800/60 border border-white/6 rounded-xl p-4">
                    <p className="text-white text-xs font-bold uppercase tracking-widest mb-3">Roles</p>
                    <div className="grid grid-cols-2 gap-2">
                      {!user.isAdmin && (
                        <RoleToggle label="Moderator" active={user.isModerator} color="blue" onToggle={() => toggleRole("isModerator", user.isModerator)} />
                      )}
                      <RoleToggle label="VIP" active={user.isVip} color="yellow" onToggle={() => toggleRole("isVip", user.isVip)} />
                      <RoleToggle label="Depositor" active={user.isDepositor} color="green" onToggle={() => toggleRole("isDepositor", user.isDepositor)} />
                    </div>
                  </div>

                  {/* Adjust coins */}
                  <div className="bg-navy-800/60 border border-white/6 rounded-xl p-4 space-y-3">
                    <p className="text-white text-xs font-bold uppercase tracking-widest">Adjust Coins</p>
                    <div className="flex rounded-lg overflow-hidden border border-white/8">
                      <button onClick={() => setCoinsOp("add")} className={`flex-1 py-2 text-xs font-bold transition-colors ${coinsOp === "add" ? "bg-green-600 text-white" : "bg-black/30 text-gray-400"}`}>+ Add</button>
                      <button onClick={() => setCoinsOp("remove")} className={`flex-1 py-2 text-xs font-bold transition-colors ${coinsOp === "remove" ? "bg-red-600 text-white" : "bg-black/30 text-gray-400"}`}>− Remove</button>
                    </div>
                    <input type="number" min="1" value={coinsAmount} onChange={(e) => setCoinsAmount(e.target.value)}
                      placeholder="Amount" className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/40" />
                    <input type="text" value={coinsReason} onChange={(e) => setCoinsReason(e.target.value)}
                      placeholder="Reason (required)" className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/40" />
                    <button onClick={handleCoins} disabled={coinsSaving || !coinsAmount || !coinsReason.trim()}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-40 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wide transition-colors">
                      {coinsSaving ? "Saving…" : "Apply"}
                    </button>
                    {coinsMsg && <p className={`text-xs ${coinsMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{coinsMsg}</p>}
                  </div>

                  {/* Wagered / Deposited */}
                  <div className="bg-navy-800/60 border border-white/6 rounded-xl p-4 space-y-3">
                    <p className="text-white text-xs font-bold uppercase tracking-widest">Wager & Deposit</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Total Wagered ($)</label>
                        <input type="number" min="0" step="0.01" value={newWager} onChange={(e) => setNewWager(e.target.value)}
                          className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500/30" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Total Deposited ($)</label>
                        <input type="number" min="0" step="0.01" value={newDeposited} onChange={(e) => setNewDeposited(e.target.value)}
                          className="w-full bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/30" />
                      </div>
                    </div>
                    <button onClick={handleWager} disabled={wagerSaving}
                      className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wide transition-colors">
                      {wagerSaving ? "Saving…" : "Update"}
                    </button>
                    {wagerMsg && <p className={`text-xs ${wagerMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{wagerMsg}</p>}
                  </div>

                  {/* Recent transactions */}
                  {user.pointTransactions.length > 0 && (
                    <div className="bg-navy-800/60 border border-white/6 rounded-xl p-4">
                      <p className="text-white text-xs font-bold uppercase tracking-widest mb-3">Recent Transactions</p>
                      <TxList transactions={user.pointTransactions} />
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type Tx = { id: string; amount: number; transactionType: string; reason?: string; createdAt: string };

interface TxGroup {
  key: string;
  label: string;
  date: string;
  totalAmount: number;
  items: Tx[];
}

function TxList({ transactions }: { transactions: Tx[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups: TxGroup[] = [];
  for (const tx of transactions) {
    const label = tx.reason || tx.transactionType;
    const date = new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const key = `${label}||${date}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.totalAmount += tx.amount;
      last.items.push(tx);
    } else {
      groups.push({ key, label, date, totalAmount: tx.amount, items: [tx] });
    }
  }

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-0 max-h-64 overflow-y-auto pr-1">
      {groups.map((g) => {
        const isGroup = g.items.length > 1;
        const isOpen = expanded.has(g.key);
        return (
          <div key={g.key}>
            <div
              className={`flex items-center justify-between py-1.5 border-b border-white/4 ${isGroup ? "cursor-pointer hover:bg-white/3 rounded px-1 -mx-1" : ""}`}
              onClick={() => isGroup && toggle(g.key)}
            >
              <div className="min-w-0 flex items-center gap-1.5">
                {isGroup && (
                  isOpen ? <ChevronUp size={11} className="text-gray-400 shrink-0" /> : <ChevronDown size={11} className="text-gray-400 shrink-0" />
                )}
                <div>
                  <p className="text-gray-300 text-xs truncate">
                    {g.label}
                    {isGroup && <span className="text-gray-400 ml-1">×{g.items.length}</span>}
                  </p>
                  <p className="text-gray-400 text-[10px]">{g.date}</p>
                </div>
              </div>
              <span className={`text-sm font-bold shrink-0 ml-3 ${g.totalAmount >= 0 ? "text-green-400" : "text-red-400"}`}>
                {g.totalAmount >= 0 ? "+" : ""}{g.totalAmount.toLocaleString()}
              </span>
            </div>
            {isGroup && isOpen && (
              <div className="ml-4 border-l border-white/6 pl-2 mb-1">
                {g.items.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1 border-b border-white/3 last:border-0">
                    <p className="text-gray-400 text-[10px]">{new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                    <span className={`text-xs font-bold shrink-0 ml-3 ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoleToggle({ label, active, color, onToggle }: { label: string; active: boolean; color: string; onToggle: () => void }) {
  const colors: Record<string, string> = {
    blue:   active ? "bg-blue-600 border-blue-500 text-white"   : "bg-white/3 border-white/10 text-gray-400",
    yellow: active ? "bg-yellow-600 border-yellow-500 text-white" : "bg-white/3 border-white/10 text-gray-400",
    green:  active ? "bg-green-600 border-green-500 text-white"  : "bg-white/3 border-white/10 text-gray-400",
  };
  return (
    <button onClick={onToggle} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${colors[color]}`}>
      <span>{label}</span>
      {active ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
    </button>
  );
}
