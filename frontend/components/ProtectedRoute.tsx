"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, User } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireModerator = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await getUser();

      if (!userData) {
        // Not logged in - redirect to home with message
        router.push("/?login=required");
        return;
      }

      // Check admin requirement
      if (requireAdmin && !userData.isAdmin) {
        router.push("/?error=admin_required");
        return;
      }

      // Check moderator requirement
      if (requireModerator && !userData.isModerator && !userData.isAdmin) {
        router.push("/?error=moderator_required");
        return;
      }

      setUser(userData);
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/?login=required");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
