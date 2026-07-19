"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Loader2, X } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/ToastProvider";

interface AdjustPointsModalProps {
  // Single-user mode when userIds has one id (label shows the user's name);
  // bulk mode when it has many.
  userIds: string[];
  userLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustPointsModal({ userIds, userLabel, onClose, onSuccess }: AdjustPointsModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const submit = async () => {
    const amountNum = parseInt(amount, 10);
    if (!amountNum || Number.isNaN(amountNum)) {
      error("Invalid amount", "Enter a non-zero number of coins.");
      return;
    }
    if (!reason.trim()) {
      error("Reason required", "Explain why you're adjusting points.");
      return;
    }

    setLoading(true);
    try {
      const isBulk = userIds.length > 1;
      const res = await authFetch(isBulk ? API_ENDPOINTS.ADMIN_USERS_BULK_POINTS : API_ENDPOINTS.ADMIN_USER_POINTS(userIds[0]), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isBulk ? { userIds, amount: amountNum, reason } : { amount: amountNum, reason }),
      });
      if (res.ok) {
        success("Points adjusted", `${amountNum > 0 ? "+" : ""}${amountNum.toLocaleString()} coins for ${userLabel}.`);
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        error("Failed", data.message || "Could not adjust points.");
      }
    } catch {
      error("Error", "Network error while adjusting points.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-navy-900 border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-500/15 flex items-center justify-center">
                <Coins className="w-4 h-4 text-gold-400" />
              </div>
              <h2 className="text-white font-semibold text-sm">Adjust Points — {userLabel}</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (use a negative number to deduct)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500 or -200"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gold-400/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why is this adjustment being made?"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gold-400/50 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-white/6 hover:bg-white/10 text-gray-300 font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
