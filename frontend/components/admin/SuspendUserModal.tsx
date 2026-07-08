"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Loader2, X } from "lucide-react";

interface SuspendUserModalProps {
  displayName: string;
  onClose: () => void;
  onConfirm: (reason: string, durationHours?: number) => Promise<void>;
}

const DURATION_OPTIONS = [
  { label: "Permanent", hours: undefined },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

export default function SuspendUserModal({ displayName, onClose, onConfirm }: SuspendUserModalProps) {
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const submit = async () => {
    if (!reason.trim()) {
      setValidationError("A reason is required.");
      return;
    }
    setLoading(true);
    try {
      await onConfirm(reason, durationHours);
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
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Ban className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-white font-semibold text-sm">Suspend {displayName}</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            This immediately invalidates all active sessions and blocks the user from using the platform.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setValidationError(""); }}
                rows={3}
                placeholder="Why is this account being suspended?"
                className="w-full bg-navy-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-400/50 resize-none"
              />
              {validationError && <p className="text-red-400 text-xs mt-1">{validationError}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Duration</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setDurationHours(opt.hours)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      durationHours === opt.hours
                        ? "bg-red-500/20 border-red-500/40 text-red-300"
                        : "bg-white/3 border-white/8 text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suspend Account"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
