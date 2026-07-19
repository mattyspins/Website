"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { API_ENDPOINTS } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { isAuthenticated } from "@/lib/authPersistence";
import AdminSidebar from "./AdminSidebar";
import AdminTopNav from "./AdminTopNav";

// Wraps every /admin/* route: does the admin-access check once, and renders the
// sidebar + top nav shell around whatever page is active.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { error } = useToast();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isAuthenticated()) { router.push("/"); return; }

      try {
        const res = await authFetch(API_ENDPOINTS.AUTH_ME);
        if (res.ok) {
          const data = await res.json();
          if (!data.user?.isAdmin) {
            error("Access Denied", "Admin privileges required.");
            router.push("/");
          } else {
            setLoading(false);
          }
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    };
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      <AdminSidebar
        collapsed={collapsed}
        pathname={pathname}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopNav
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
