"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { API_ENDPOINTS } from "@/lib/api";

interface AuditLog {
  id: string;
  adminId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  oldValues?: any;
  newValues?: any;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
  admin?: {
    displayName: string;
  };
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    checkAdminAccess();
    loadAuditLogs();
  }, [page, filterAction]);

  const checkAdminAccess = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push("/");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.user?.isAdmin) {
          alert("Access denied. Admin privileges required.");
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Admin check failed:", error);
      router.push("/");
    }
  };

  const loadAuditLogs = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (filterAction) {
        params.append("action", filterAction);
      }

      const response = await fetch(
        `${API_ENDPOINTS.ADMIN_AUDIT_LOGS}?${params}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data.logs || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("suspend"))
      return "text-red-400";
    if (action.includes("create") || action.includes("add"))
      return "text-green-400";
    if (action.includes("update") || action.includes("adjust"))
      return "text-yellow-400";
    return "text-blue-400";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("delete")) return "🗑️";
    if (action.includes("suspend")) return "🚫";
    if (action.includes("unsuspend")) return "✅";
    if (action.includes("create")) return "➕";
    if (action.includes("update")) return "✏️";
    if (action.includes("points")) return "💎";
    return "📝";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Audit Logs</h1>
            <p className="text-gray-400">Track all administrative actions</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6 mb-6">
          <div className="flex gap-4">
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All Actions</option>
              <option value="adjust_points">Adjust Points</option>
              <option value="suspend_user">Suspend User</option>
              <option value="unsuspend_user">Unsuspend User</option>
              <option value="delete_user">Delete User</option>
              <option value="update_config">Update Config</option>
            </select>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/30 border border-purple-500/20 rounded-lg p-4 hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {getActionIcon(log.action)}
                        </span>
                        <span
                          className={`font-semibold ${getActionColor(log.action)}`}
                        >
                          {log.action.replace(/_/g, " ").toUpperCase()}
                        </span>
                        {log.admin && (
                          <span className="text-gray-400 text-sm">
                            by{" "}
                            <span className="text-white">
                              {log.admin.displayName}
                            </span>
                          </span>
                        )}
                      </div>

                      {log.reason && (
                        <p className="text-gray-300 text-sm mb-2">
                          <span className="text-gray-500">Reason:</span>{" "}
                          {log.reason}
                        </p>
                      )}

                      {log.targetType && log.targetId && (
                        <p className="text-gray-400 text-sm">
                          Target: {log.targetType} (
                          {log.targetId.substring(0, 8)}...)
                        </p>
                      )}

                      {log.oldValues && log.newValues && (
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                            <p className="text-red-400 font-semibold mb-1">
                              Before:
                            </p>
                            <pre className="text-gray-300 text-xs overflow-x-auto">
                              {JSON.stringify(log.oldValues, null, 2)}
                            </pre>
                          </div>
                          <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                            <p className="text-green-400 font-semibold mb-1">
                              After:
                            </p>
                            <pre className="text-gray-300 text-xs overflow-x-auto">
                              {JSON.stringify(log.newValues, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {log.ipAddress && (
                        <p className="text-gray-500 text-xs mt-2">
                          IP: {log.ipAddress}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
