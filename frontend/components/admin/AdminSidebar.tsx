"use client";

import Link from "next/link";
import {
  LayoutDashboard, Users, ClipboardList, ShoppingBag, Calendar, Medal,
  Trophy, Target, Ticket, Zap, Grid3X3, Dices, FileText, Activity, Shield, X, Gift, Swords, Coins,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const MAIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/razed-users", label: "Razed Users", icon: Coins },
];

const OPERATIONS_NAV: NavItem[] = [
  { href: "/admin/claims", label: "Claims", icon: ClipboardList },
  { href: "/admin/store", label: "Store", icon: ShoppingBag },
  { href: "/admin/schedule", label: "Schedule", icon: Calendar },
  { href: "/admin/milestones", label: "Milestones", icon: Medal },
  { href: "/admin/audit-logs", label: "Activity Feed", icon: Activity },
  { href: "/admin/audit-log", label: "Audit Log", icon: FileText },
];

const GAMES_NAV: NavItem[] = [
  { href: "/admin/raffle", label: "Raffles", icon: Ticket },
  { href: "/admin/weekly-raffle", label: "Weekly Raffle", icon: Gift },
  { href: "/admin/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/admin/tournament", label: "Tournament", icon: Trophy },
  { href: "/admin/guess-the-balance", label: "Guess the Balance", icon: Target },
  { href: "/hunt-tracker", label: "Bonus Hunt", icon: Zap },
  { href: "/admin/bonus-bingo", label: "Bonus Bingo", icon: Grid3X3 },
  { href: "/admin/viewer-picker", label: "Viewer Picker", icon: Users },
  { href: "/admin/king-of-the-hill", label: "King of the Hill", icon: Trophy },
  { href: "/admin/high-roller", label: "High Roller", icon: Dices },
  { href: "/admin/boss-raid", label: "Boss Raid", icon: Swords },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({ label, items, collapsed, pathname, onNavigate }: {
  label: string; items: NavItem[]; collapsed: boolean; pathname: string; onNavigate: () => void;
}) {
  return (
    <div className="mb-6">
      {!collapsed && (
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">{label}</p>
      )}
      <div className="space-y-0.5">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? itemLabel : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-gold-500/10 text-gold-400" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{itemLabel}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminSidebar({
  collapsed,
  pathname,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  pathname: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const content = (
    <>
      <div className="h-16 flex items-center justify-between gap-2 px-4 border-b border-white/6 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-5 h-5 text-gold-400 shrink-0" />
          {!collapsed && <span className="font-gaming font-bold text-white text-sm tracking-widest truncate">ADMIN</span>}
        </div>
        <button onClick={onCloseMobile} className="sm:hidden p-1 text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <NavGroup label="Overview" items={MAIN_NAV} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        <NavGroup label="Operations" items={OPERATIONS_NAV} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        <NavGroup label="Stream Games" items={GAMES_NAV} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden sm:flex shrink-0 border-r border-white/6 bg-navy-900/60 flex-col transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative w-64 bg-navy-900 border-r border-white/6 flex flex-col">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
