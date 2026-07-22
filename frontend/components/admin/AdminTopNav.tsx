"use client";

import { Menu, PanelLeftClose, PanelLeft, ExternalLink } from "lucide-react";

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Users",
  "/admin/claims": "Claims",
  "/admin/store": "Store",
  "/admin/schedule": "Schedule",
  "/admin/milestones": "Milestones",
  "/admin/audit-logs": "Activity Feed",
  "/admin/audit-log": "Audit Log",
};

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/admin/users/")) return "User Profile";
  return "Admin";
}

export default function AdminTopNav({
  pathname,
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}) {
  return (
    <header className="h-16 shrink-0 border-b border-white/6 bg-navy-900/60 backdrop-blur flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="sm:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden sm:block p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <h1 className="text-white font-semibold text-sm sm:text-base truncate">{titleFor(pathname)}</h1>
      </div>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors shrink-0"
      >
        <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">View Site</span>
      </a>
    </header>
  );
}
