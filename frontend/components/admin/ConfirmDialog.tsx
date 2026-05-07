"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: "red" | "yellow" | "green" | "purple";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmText,
  confirmColor = "red",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const getColorClasses = () => {
    switch (confirmColor) {
      case "red":
        return "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800";
      case "yellow":
        return "from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800";
      case "green":
        return "from-green-600 to-green-700 hover:from-green-700 hover:to-green-800";
      case "purple":
        return "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800";
      default:
        return "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-2xl p-4 sm:p-6 w-full max-w-md"
        >
          {/* Icon */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="bg-yellow-500/20 rounded-full p-2 sm:p-3">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-2 sm:mb-3">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-4 sm:mb-6 text-sm sm:text-base">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 bg-gradient-to-r ${getColorClasses()} text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
