"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Coins, Trophy, Clock, Check, Activity, Link as LinkIcon,
  Shield, Star, UserCheck, Ban, TrendingUp, ShoppingCart, Monitor, Receipt,
  Gamepad2, Ticket, Gift, Target, Zap, Grid3x3, Dices, Swords, Crosshair, Mountain,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SuspendUserModal from "@/components/admin/SuspendUserModal";

const ACCENT = "#f5a623";

interface UserSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

interface GameParticipation {
  key: string;
  name: string;
  icon: string;
  entries: number;
  wins: number;
  status: "WON" | "PLAYED" | "NONE";
  detail: string;
}

interface Engagement {
  rank: number;
  streamsWatched: number;
  watchMinutes: number;
  gamesPlayed: number;
  totalGames: number;
  gamesWon: number;
  games: GameParticipation[];
}

interface UserDetail {
  id: string;
  displayName: string;
  avatarUrl?: string;
  discordId: string;
  kickUsername?: string;
  kickVerified: boolean;
  rainbetUsername?: string;
  rainbetVerified: boolean;
  todayWagered: string;
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
  suspensionReason?: string;
  suspensionExpiresAt?: string;
  createdAt: string;
  lastActiveAt: string;
  pointTransactions: Array<{
    id: string; amount: number; transactionType: string;
    reason?: string; createdAt: string;
  }>;
}

const GAME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ticket: Ticket, hill: Mountain, gift: Gift, target: Target, zap: Zap,
  bingo: Grid3x3, dice: Dices, trophy: Trophy, sword: Swords, crosshair: Crosshair,
};

function fmt(minutes: number) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const shortDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ── Reusable dark card + section heading ─────────────────────────────────── */

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`bg-[#0d0d10] border border-white/[0.07] rounded-[18px] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, right }: { icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        {icon && <span style={{ color: ACCENT }} className="inline-flex w-4 h-4">{icon}</span>}
        <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px] text-[#e8e8ec]">{children}</h2>
      </div>
      {right}
    </div>
  );
}

export default function AdminUserPage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
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
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

  // Moderator grant confirmation (revoking needs no confirmation)
  const [showModConfirm, setShowModConfirm] = useState(false);

  // Balance/wager edits move real value and are not self-evidently reversible,
  // so they confirm before committing rather than firing on a single click.
  const [showCoinsConfirm, setShowCoinsConfirm] = useState(false);
  const [showWagerConfirm, setShowWagerConfirm] = useState(false);

  // Razed recheck
  const [razedChecking, setRazedChecking] = useState(false);

  // Login sessions
  const [sessions, setSessions] = useState<UserSession[] | null>(null);

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

    fetch(API_ENDPOINTS.ADMIN_USER_SESSIONS(userId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSessions(d.data.sessions); })
      .catch(() => setSessions([]));

    fetch(API_ENDPOINTS.ADMIN_USER_ENGAGEMENT(userId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setEngagement(d.data); })
      .catch(() => setEngagement(null));
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
        setCoinsMsg(`✓ ${coinsOp === "add" ? "Added" : "Removed"} ${Math.abs(amount).toLocaleString()} Matty Coins`);
      } else { setCoinsMsg("Failed to update Matty Coins."); }
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

  const handleSuspend = async (reason?: string, durationHours?: number) => {
    if (!user) return;
    setSuspendSaving(true);
    const endpoint = user.isSuspended
      ? API_ENDPOINTS.ADMIN_USER_UNSUSPEND(user.id)
      : API_ENDPOINTS.ADMIN_USER_SUSPEND(user.id);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: user.isSuspended ? undefined : JSON.stringify({ reason, durationHours }),
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

  const handleRecheckRazed = async () => {
    if (!user) return;
    setRazedChecking(true);
    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_RECHECK_RAZED(user.id), {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setUser((u) => u ? { ...u, rainbetVerified: !!d.data?.verified } : u);
        success(d.data?.verified ? "Verified via Razed API" : "Not found under our code", "Marked accordingly");
      } else {
        toastError("Recheck failed", d.error?.message || "Could not reach Razed API.");
      }
    } catch {
      toastError("Error", "Network error.");
    } finally {
      setRazedChecking(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-yellow-500/40 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !user) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <p className="text-gray-400 text-lg font-semibold mb-2">User not found</p>
        <button onClick={() => router.back()} className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors">← Back</button>
      </div>
    </div>
  );

  const roleLabel = user.isAdmin ? "Admin" : user.isModerator ? "Moderator"
    : user.isVip ? "VIP" : user.isDepositor ? "Depositor" : "Member";
  const isVerified = user.kickVerified || user.rainbetVerified;
  const totalEntries = engagement?.games.reduce((n, g) => n + g.entries, 0) ?? 0;

  const stats = [
    { icon: <Coins className="w-4 h-4" />,        label: "MATTY COINS",            value: user.points.toLocaleString(),                            accent: "#4fbfd1", valueColor: "#e8e8ec" },
    { icon: <TrendingUp className="w-4 h-4" />,   label: "TOTAL EARNED",       value: (user.totalEarned ?? 0).toLocaleString(),                accent: "#4fd18b", valueColor: "#4fd18b" },
    { icon: <ShoppingCart className="w-4 h-4" />, label: "TOTAL SPENT",        value: (user.totalSpent ?? 0).toLocaleString(),                 accent: "#f16060", valueColor: "#e8e8ec" },
    { icon: <Trophy className="w-4 h-4" />,       label: "WAGERED (WEEK)",     value: `$${Number(user.weeklyWagered ?? 0).toLocaleString()}`,  accent: ACCENT,    valueColor: "#e8e8ec" },
    { icon: <Trophy className="w-4 h-4" />,       label: "WAGERED (MONTH)",    value: `$${Number(user.monthlyWagered ?? 0).toLocaleString()}`, accent: ACCENT,    valueColor: "#e8e8ec" },
    { icon: <Trophy className="w-4 h-4" />,       label: "WAGERED (LIFETIME)", value: `$${Number(user.totalWagered ?? 0).toLocaleString()}`,   accent: ACCENT,    valueColor: "#e8e8ec" },
  ];

  return (
    <div className="text-[#e8e8ec]" style={{ ["--accent" as string]: ACCENT }}>
      <div className="max-w-[1520px] mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2.5 text-sm mb-6 text-[#7a7a83]">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[#9a9aa3] hover:text-[#e8e8ec] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </button>
          <span className="text-[#3a3a42]">/</span>
          <span className="truncate" style={{ color: ACCENT }}>{user.displayName}</span>
        </div>

        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative border border-white/[0.07] rounded-[18px] px-[30px] py-7 mb-6"
          style={{ background: `radial-gradient(120% 160% at 0% 0%, color-mix(in srgb, ${ACCENT} 9%, transparent), transparent 55%), #0d0d10` }}>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="w-[78px] h-[78px] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden text-3xl font-black text-white"
                style={{ background: "linear-gradient(150deg,#f5d020,#4fd18b)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span>{user.displayName.charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-mono text-[26px] font-bold tracking-[0.5px] m-0">{user.displayName}</h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-[3px] rounded-full"
                      style={{ color: "#4fd18b", background: "rgba(79,209,139,0.12)", border: "1px solid rgba(79,209,139,0.28)" }}>
                      <Check className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                  {user.isSuspended && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-[3px] rounded-full"
                      style={{ color: "#f16060", background: "rgba(239,96,96,0.12)", border: "1px solid rgba(239,96,96,0.28)" }}>
                      <Ban className="w-3 h-3" /> SUSPENDED
                    </span>
                  )}
                </div>
                <div className="font-mono text-[13px] text-[#6b6b73] mt-1.5">{user.discordId}</div>
                <div className="flex gap-2 mt-3">
                  <span className="text-[11.5px] font-semibold px-[11px] py-1 rounded-full text-[#c9c9d0]"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{roleLabel}</span>
                  {engagement && (
                    <span className="text-[11.5px] font-semibold px-[11px] py-1 rounded-full"
                      style={{ color: ACCENT, background: `color-mix(in srgb, ${ACCENT} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${ACCENT} 24%, transparent)` }}>
                      Rank #{engagement.rank.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-[#8a8a93] leading-[2]">
              <div>Joined <b className="text-[#e8e8ec] font-semibold">{shortDate(user.createdAt)}</b></div>
              <div>Last active <b className="text-[#e8e8ec] font-semibold">{shortDate(user.lastActiveAt)}</b></div>
            </div>
          </div>
        </motion.div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6 min-w-0">

            {/* STREAM ENGAGEMENT */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
              <Card className="px-[26px] py-6"
                style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${ACCENT} 7%, transparent), rgba(13,13,16,0) 60%), #0d0d10`, border: `1px solid color-mix(in srgb, ${ACCENT} 22%, transparent)` }}>
                <SectionTitle icon={<Activity className="w-4 h-4" />}>STREAM ENGAGEMENT</SectionTitle>
                <div className="grid grid-cols-3 gap-[18px]">
                  {/* Watch time */}
                  <div className="px-0.5 py-1.5">
                    <div className="flex items-center gap-2.5 mb-3" style={{ color: "#4fbfd1" }}>
                      <Clock className="w-[17px] h-[17px]" />
                      <span className="font-mono text-[10.5px] tracking-[1.3px] text-[#8a8a93]">WATCH TIME</span>
                    </div>
                    <div className="font-mono text-[30px] font-bold leading-none">{fmt(user.totalWatchMinutes)}</div>
                    <div className="text-[12.5px] text-[#6b6b73] mt-2">
                      {engagement ? `across ${engagement.streamsWatched.toLocaleString()} streams watched` : "loading…"}
                    </div>
                  </div>
                  {/* Streams watched */}
                  <div className="px-0.5 py-1.5 pl-[22px] border-l border-white/[0.06]">
                    <div className="flex items-center gap-2.5 mb-3" style={{ color: "#4fd18b" }}>
                      <Monitor className="w-[17px] h-[17px]" />
                      <span className="font-mono text-[10.5px] tracking-[1.3px] text-[#8a8a93]">STREAMS WATCHED</span>
                    </div>
                    <div className="font-mono text-[30px] font-bold leading-none">{engagement ? engagement.streamsWatched.toLocaleString() : "—"}</div>
                    <div className="text-[12.5px] text-[#6b6b73] mt-2">
                      {user.firstWatchedAt ? `since ${shortDate(user.firstWatchedAt)}` : "no sessions yet"}
                    </div>
                  </div>
                  {/* Games played */}
                  <div className="px-0.5 py-1.5 pl-[22px] border-l border-white/[0.06]">
                    <div className="flex items-center gap-2.5 mb-3" style={{ color: ACCENT }}>
                      <Gamepad2 className="w-[17px] h-[17px]" />
                      <span className="font-mono text-[10.5px] tracking-[1.3px] text-[#8a8a93]">GAMES PLAYED</span>
                    </div>
                    <div className="font-mono text-[30px] font-bold leading-none">
                      {engagement ? engagement.gamesPlayed : "—"}
                      {engagement && <span className="text-base text-[#8a8a93]"> / {engagement.totalGames}</span>}
                    </div>
                    <div className="text-[12.5px] text-[#6b6b73] mt-2">
                      {engagement ? `${engagement.gamesWon} wins · ${totalEntries.toLocaleString()} total entries` : "loading…"}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* STAT CARDS */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="relative border border-white/[0.07] rounded-[15px] px-[18px] pt-[18px] pb-5"
                  style={{ background: `linear-gradient(155deg, color-mix(in srgb, ${s.accent} 7%, transparent), transparent 62%), #0d0d10` }}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="inline-flex w-4 h-4" style={{ color: s.accent }}>{s.icon}</span>
                    <span className="font-mono text-[10px] tracking-[1.2px] text-[#8a8a93]">{s.label}</span>
                  </div>
                  <div className="font-mono text-[23px] font-bold" style={{ color: s.valueColor }}>{s.value}</div>
                </div>
              ))}
            </motion.div>

            {/* STREAM GAMES */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
              <Card className="px-[26px] py-6">
                <SectionTitle icon={<Trophy className="w-4 h-4" />}
                  right={engagement && (
                    <span className="text-[12.5px] text-[#6b6b73]">
                      Participated in <b className="text-[#e8e8ec]">{engagement.gamesPlayed} of {engagement.totalGames}</b> games
                    </span>
                  )}>
                  STREAM GAMES
                </SectionTitle>
                {!engagement ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-yellow-500/40 border-t-yellow-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {engagement.games.map((g) => {
                      const GIcon = GAME_ICONS[g.icon] ?? Gamepad2;
                      const won = g.status === "WON";
                      const played = g.status === "PLAYED";
                      const tag = won
                        ? { color: ACCENT, bg: `color-mix(in srgb, ${ACCENT} 14%, transparent)`, border: `color-mix(in srgb, ${ACCENT} 32%, transparent)` }
                        : played
                          ? { color: "#4fd18b", bg: "rgba(79,209,139,0.12)", border: "rgba(79,209,139,0.28)" }
                          : { color: "#6b6b73", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)" };
                      const iconBox = won
                        ? { bg: `color-mix(in srgb, ${ACCENT} 14%, transparent)`, color: ACCENT }
                        : played
                          ? { bg: "rgba(79,209,139,0.12)", color: "#4fd18b" }
                          : { bg: "rgba(255,255,255,0.04)", color: "#6b6b73" };
                      const rowBorder = won ? `color-mix(in srgb, ${ACCENT} 22%, transparent)`
                        : played ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)";
                      return (
                        <div key={g.key} className="flex items-center justify-between gap-3.5 px-[15px] py-[13px] rounded-xl"
                          style={{ border: `1px solid ${rowBorder}`, background: won ? `linear-gradient(150deg, color-mix(in srgb, ${ACCENT} 6%, transparent), transparent 70%)` : played ? "rgba(255,255,255,0.015)" : "transparent" }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-[34px] h-[34px] shrink-0 rounded-[9px] inline-flex items-center justify-center"
                              style={{ background: iconBox.bg, color: iconBox.color }}>
                              <GIcon className="w-[17px] h-[17px]" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#e8e8ec] truncate">{g.name}</div>
                              <div className="text-xs text-[#7a7a83] mt-0.5">{g.detail}</div>
                            </div>
                          </div>
                          <span className="shrink-0 text-[10.5px] font-semibold tracking-[0.6px] px-2.5 py-1 rounded-full"
                            style={{ color: tag.color, background: tag.bg, border: `1px solid ${tag.border}` }}>
                            {g.status === "NONE" ? "—" : g.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* LINKED ACCOUNTS */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <Card className="px-[26px] py-6">
                <SectionTitle icon={<LinkIcon className="w-4 h-4" />}>LINKED ACCOUNTS</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Kick */}
                  <div className="rounded-[13px] p-4"
                    style={{ border: user.kickVerified ? "1px solid rgba(79,209,139,0.22)" : "1px solid rgba(255,255,255,0.08)",
                      background: user.kickVerified ? "linear-gradient(150deg,rgba(79,209,139,0.06),transparent 70%)" : "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-[22px] h-[22px] rounded-md flex items-center justify-center font-mono font-extrabold text-[13px] text-black" style={{ background: "#53fc18" }}>K</span>
                        <b className="text-sm">Kick</b>
                      </div>
                      {user.kickVerified
                        ? <span className="text-[10.5px] font-semibold" style={{ color: "#4fd18b" }}>VERIFIED</span>
                        : user.kickUsername ? <span className="text-[10.5px] font-semibold" style={{ color: ACCENT }}>PENDING</span> : null}
                    </div>
                    <div className={`text-sm ${user.kickUsername ? "text-[#c9c9d0]" : "text-[#6b6b73]"}`}>{user.kickUsername || "Not linked"}</div>
                  </div>
                  {/* Razed */}
                  <div className="rounded-[13px] p-4"
                    style={{ border: user.rainbetVerified ? `1px solid color-mix(in srgb, ${ACCENT} 22%, transparent)` : "1px solid rgba(255,255,255,0.08)",
                      background: user.rainbetVerified ? `linear-gradient(150deg,color-mix(in srgb, ${ACCENT} 6%, transparent),transparent 70%)` : "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-[22px] h-[22px] rounded-md flex items-center justify-center font-mono font-extrabold text-[13px] text-black" style={{ background: ACCENT }}>R</span>
                        <b className="text-sm">Razed</b>
                      </div>
                      {user.rainbetVerified
                        ? <span className="text-[10.5px] font-semibold" style={{ color: "#4fd18b" }}>VERIFIED</span>
                        : user.rainbetUsername ? <span className="text-[10.5px] font-semibold" style={{ color: ACCENT }}>PENDING</span> : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm ${user.rainbetUsername ? "text-[#c9c9d0]" : "text-[#6b6b73]"}`}>{user.rainbetUsername || "Not linked"}</span>
                      {user.rainbetUsername && (
                        <button onClick={handleRecheckRazed} disabled={razedChecking}
                          className="text-[10.5px] font-semibold tracking-[0.5px] shrink-0 disabled:opacity-40" style={{ color: ACCENT }}>
                          {razedChecking ? "CHECKING…" : "RECHECK VIA API"}
                        </button>
                      )}
                    </div>
                    {user.rainbetUsername && (
                      <div className="border-t border-white/[0.07] mt-3 pt-[11px]">
                        <div className="font-mono text-[10px] tracking-[1px] text-[#7a7a83]">TODAY</div>
                        <div className="font-mono text-[17px] font-bold mt-[3px]" style={{ color: ACCENT }}>${Number(user.todayWagered).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* RECENT TRANSACTIONS */}
            {user.pointTransactions?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="px-[26px] py-6">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span style={{ color: ACCENT }} className="inline-flex w-4 h-4"><Receipt className="w-4 h-4" /></span>
                    <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px]">RECENT TRANSACTIONS</h2>
                  </div>
                  <div className="flex flex-col">
                    {user.pointTransactions.slice(0, 15).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-[15px] border-b border-white/[0.06] last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-[#e8e8ec] truncate">{tx.reason || tx.transactionType}</div>
                          <div className="text-xs text-[#6b6b73] mt-[3px]">{shortDate(tx.createdAt)}</div>
                        </div>
                        <span className="font-mono font-bold text-[15px] shrink-0 ml-4" style={{ color: tx.amount >= 0 ? "#4fd18b" : "#f16060" }}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* LOGIN SESSIONS */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <Card className="px-[26px] py-6">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span style={{ color: ACCENT }} className="inline-flex w-4 h-4"><Monitor className="w-4 h-4" /></span>
                  <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px]">LOGIN SESSIONS</h2>
                </div>
                {!sessions ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-yellow-500/40 border-t-yellow-500 rounded-full animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-[#6b6b73] text-sm py-2">No active sessions.</p>
                ) : (
                  sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-4 py-[15px] border-b border-white/[0.06] last:border-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <Monitor className="w-[17px] h-[17px] text-[#6b6b73] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-mono text-[13.5px] text-[#e8e8ec]">{s.ipAddress || "Unknown IP"}</div>
                          <div className="text-xs text-[#6b6b73] mt-[3px] truncate">{s.userAgent || "Unknown device"}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12.5px]" style={{ color: "#4fd18b" }}>Active {shortDate(s.lastUsedAt)}</div>
                        <div className="text-xs text-[#6b6b73] mt-[3px]">Expires {shortDate(s.expiresAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </motion.div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">

            {/* ROLES */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <Card className="p-[22px]">
                <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px] mb-4">ROLES</h2>
                <div className="flex flex-col gap-2.5">
                  {!user.isAdmin && (
                    <RoleToggle label="Moderator" icon={<Shield className="w-4 h-4" />} active={user.isModerator}
                      onToggle={() => user.isModerator ? toggleRole("isModerator", user.isModerator) : setShowModConfirm(true)} />
                  )}
                  <RoleToggle label="VIP" icon={<Star className="w-4 h-4" />} active={user.isVip} onToggle={() => toggleRole("isVip", user.isVip)} />
                  <RoleToggle label="Depositor" icon={<UserCheck className="w-4 h-4" />} active={user.isDepositor} onToggle={() => toggleRole("isDepositor", user.isDepositor)} />
                </div>
              </Card>
            </motion.div>

            {/* ADJUST COINS */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
              <Card className="p-[22px]">
                <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px] mb-1.5">ADJUST MATTY COINS</h2>
                <div className="text-[12.5px] text-[#8a8a93] mb-4">Current balance: <b style={{ color: ACCENT }}>{user.points.toLocaleString()}</b></div>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setCoinsOp("add")}
                    className="flex-1 py-2.5 rounded-[9px] font-bold text-[13px] transition-colors"
                    style={coinsOp === "add"
                      ? { background: "#22a35a", color: "#fff" }
                      : { background: "rgba(255,255,255,0.03)", color: "#c9c9d0", border: "1px solid rgba(255,255,255,0.12)" }}>+ Add</button>
                  <button onClick={() => setCoinsOp("remove")}
                    className="flex-1 py-2.5 rounded-[9px] font-bold text-[13px] transition-colors"
                    style={coinsOp === "remove"
                      ? { background: "#c0392b", color: "#fff" }
                      : { background: "rgba(255,255,255,0.03)", color: "#c9c9d0", border: "1px solid rgba(255,255,255,0.12)" }}>− Remove</button>
                </div>
                {/* Labels are visually hidden (the card heading already gives
                    context) but present for screen readers — a placeholder is
                    not a label: it disappears on first keystroke. */}
                <label htmlFor="coins-amount" className="sr-only">Amount of Matty Coins</label>
                <input id="coins-amount" type="number" min="1" value={coinsAmount} onChange={(e) => setCoinsAmount(e.target.value)} placeholder="Amount"
                  className="w-full px-3 py-2.5 mb-2.5 rounded-[9px] bg-surface text-content text-[13px] border border-white/10 focus:outline-none focus:border-warning/40" />
                <label htmlFor="coins-reason" className="sr-only">Reason for adjustment (required)</label>
                <input id="coins-reason" type="text" required value={coinsReason} onChange={(e) => setCoinsReason(e.target.value)} placeholder="Reason (required)"
                  className="w-full px-3 py-2.5 mb-3.5 rounded-[9px] bg-surface text-content text-[13px] border border-white/10 focus:outline-none focus:border-warning/40" />
                <button onClick={() => setShowCoinsConfirm(true)} disabled={coinsSaving || !coinsAmount || !coinsReason.trim()}
                  className="w-full py-3 rounded-[9px] font-mono font-bold text-[13px] tracking-[0.5px] disabled:cursor-not-allowed transition-colors"
                  style={coinsSaving || !coinsAmount || !coinsReason.trim()
                    ? { background: "#5a4415", color: "#8a7a4a" }
                    : { background: ACCENT, color: "#1a1206" }}>
                  {coinsSaving ? "SAVING…" : "APPLY"}
                </button>
                {coinsMsg && <p className="text-xs font-medium mt-2.5" style={{ color: coinsMsg.startsWith("✓") ? "#4fd18b" : "#f16060" }}>{coinsMsg}</p>}
              </Card>
            </motion.div>

            {/* WAGER & DEPOSIT */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
              <Card className="p-[22px]">
                <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px] mb-4">WAGER &amp; DEPOSIT</h2>
                <label htmlFor="total-wagered" className="block text-[12.5px] text-content-muted mb-[7px]">Total Wagered ($)</label>
                <input id="total-wagered" type="number" min="0" step="0.01" value={newWager} onChange={(e) => setNewWager(e.target.value)}
                  className="w-full px-3 py-2.5 mb-4 rounded-[9px] bg-surface text-content text-[13px] font-mono border border-white/10 focus:outline-none focus:border-warning/40" />
                <label htmlFor="total-deposited" className="block text-[12.5px] text-content-muted mb-[7px]">Total Deposited ($)</label>
                <input id="total-deposited" type="number" min="0" step="0.01" value={newDeposited} onChange={(e) => setNewDeposited(e.target.value)}
                  className="w-full px-3 py-2.5 mb-[18px] rounded-[9px] bg-surface text-content text-[13px] font-mono border border-white/10 focus:outline-none focus:border-warning/40" />
                <button onClick={() => setShowWagerConfirm(true)} disabled={wagerSaving}
                  className="w-full py-3 rounded-[9px] font-bold text-[13px] disabled:opacity-40 transition-colors"
                  style={{ background: ACCENT, color: "#1a1206" }}>
                  {wagerSaving ? "Saving…" : "Update"}
                </button>
                {wagerMsg && <p className="text-xs font-medium mt-2.5" style={{ color: wagerMsg.startsWith("✓") ? "#4fd18b" : "#f16060" }}>{wagerMsg}</p>}
              </Card>
            </motion.div>

            {/* ACCOUNT */}
            {!user.isAdmin && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
                <Card className="p-[22px]">
                  <h2 className="font-mono text-[13px] font-semibold tracking-[1.5px] mb-2.5">ACCOUNT</h2>
                  <p className="text-[13px] text-[#8a8a93] leading-[1.5] mb-4">
                    {user.isSuspended
                      ? "This account is currently suspended. Users cannot log in while suspended."
                      : "Suspending will immediately invalidate all sessions."}
                  </p>
                  {user.isSuspended && user.suspensionReason && (
                    <div className="rounded-lg p-3 mb-4" style={{ background: "rgba(239,96,96,0.06)", border: "1px solid rgba(239,96,96,0.18)" }}>
                      <p className="text-[#f16060] text-xs">{user.suspensionReason}</p>
                      {user.suspensionExpiresAt && (
                        <p className="text-[#f16060]/60 text-[10px] mt-1">Expires {shortDate(user.suspensionExpiresAt)}</p>
                      )}
                    </div>
                  )}
                  <button onClick={() => (user.isSuspended ? handleSuspend() : setShowSuspendConfirm(true))} disabled={suspendSaving}
                    className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-[9px] text-[13px] transition-colors disabled:opacity-40"
                    style={user.isSuspended
                      ? { background: "#22a35a", color: "#fff" }
                      : { background: "rgba(239,68,68,0.10)", color: "#f16060", border: "1px solid rgba(239,68,68,0.35)" }}>
                    <Ban className="w-4 h-4" />
                    {suspendSaving ? "Saving…" : user.isSuspended ? "Unsuspend Account" : "Suspend Account"}
                  </button>
                </Card>
              </motion.div>
            )}

            {showSuspendConfirm && (
              <SuspendUserModal
                displayName={user.displayName}
                onClose={() => setShowSuspendConfirm(false)}
                onConfirm={async (reason, durationHours) => {
                  await handleSuspend(reason, durationHours);
                  setShowSuspendConfirm(false);
                }}
              />
            )}

            {showCoinsConfirm && (
              <ConfirmDialog
                title={coinsOp === "add" ? "Add Matty Coins?" : "Remove Matty Coins?"}
                // State the exact before → after so the admin confirms a number,
                // not an intention.
                message={
                  `${coinsOp === "add" ? "Add" : "Remove"} ${Math.abs(Number(coinsAmount) || 0).toLocaleString()} Matty Coins ` +
                  `${coinsOp === "add" ? "to" : "from"} ${user.displayName}. ` +
                  `Balance will go from ${user.points.toLocaleString()} to ` +
                  `${(user.points + (coinsOp === "add" ? 1 : -1) * Math.abs(Number(coinsAmount) || 0)).toLocaleString()}. ` +
                  `Reason: "${coinsReason.trim()}". This is recorded in the audit log.`
                }
                confirmText={coinsOp === "add" ? "Add Matty Coins" : "Remove Matty Coins"}
                confirmColor={coinsOp === "add" ? "green" : "red"}
                loading={coinsSaving}
                onCancel={() => setShowCoinsConfirm(false)}
                onConfirm={async () => {
                  await handleCoins();
                  setShowCoinsConfirm(false);
                }}
              />
            )}

            {showWagerConfirm && (
              <ConfirmDialog
                title="Update wager & deposit totals?"
                message={
                  `Overwrite ${user.displayName}'s lifetime totals — wagered ` +
                  `$${Number(user.totalWagered ?? 0).toLocaleString()} → $${Number(newWager || 0).toLocaleString()}, ` +
                  `deposited $${Number(user.totalDeposited ?? 0).toLocaleString()} → $${Number(newDeposited || 0).toLocaleString()}. ` +
                  `These figures feed leaderboards and milestones.`
                }
                confirmText="Update totals"
                confirmColor="yellow"
                loading={wagerSaving}
                onCancel={() => setShowWagerConfirm(false)}
                onConfirm={async () => {
                  await handleWager();
                  setShowWagerConfirm(false);
                }}
              />
            )}

            {showModConfirm && (
              <ConfirmDialog
                title="Grant moderator access?"
                message={`${user.displayName} will gain access to moderator-only tools and endpoints. Only grant this to someone you trust.`}
                confirmText="Grant Moderator"
                confirmColor="yellow"
                onCancel={() => setShowModConfirm(false)}
                onConfirm={async () => {
                  await toggleRole("isModerator", user.isModerator);
                  setShowModConfirm(false);
                }}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function RoleToggle({ label, icon, active, onToggle }: { label: string; icon: React.ReactNode; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-3.5 py-3 rounded-[11px] text-sm font-medium transition-all"
      style={active
        ? { border: `1px solid color-mix(in srgb, ${ACCENT} 32%, transparent)`, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, color: ACCENT }
        : { border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", color: "#c9c9d0" }}>
      <span className="flex items-center gap-2.5">
        <span style={{ color: active ? ACCENT : "#7a7a83" }}>{icon}</span>{label}
      </span>
      <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all"
        style={{ border: `2px solid ${active ? ACCENT : "rgba(255,255,255,0.18)"}`, background: active ? `color-mix(in srgb, ${ACCENT} 25%, transparent)` : "transparent" }}>
        {active && <Check className="w-3 h-3" style={{ color: ACCENT }} />}
      </span>
    </button>
  );
}
