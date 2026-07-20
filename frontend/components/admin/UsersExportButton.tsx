"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface UsersExportButtonProps {
  query: string;
  params: URLSearchParams;
}

export default function UsersExportButton({ query, params }: UsersExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { error } = useToast();

  const handleExport = async () => {
    const token = localStorage.getItem("access_token");
    setLoading(true);
    try {
      const url = new URLSearchParams(params);
      if (query) url.set("query", query);
      const res = await fetch(`${API_ENDPOINTS.ADMIN_USERS_EXPORT}?${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        error("Export failed", "Could not generate CSV export.");
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `users-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      error("Export failed", "Network error while exporting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 bg-white/6 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Export CSV
    </button>
  );
}
