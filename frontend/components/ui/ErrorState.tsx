"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  className?: string;
  variant?: "error" | "warning" | "info";
}

export default function ErrorState({
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again.",
  actionLabel = "Try Again",
  onAction,
  showHomeButton = true,
  showBackButton = false,
  className = "",
  variant = "error",
}: ErrorStateProps) {
  const variants = {
    error: {
      bg: "bg-red-500/10 border-red-500/30",
      icon: "text-red-400",
      title: "text-red-300",
      message: "text-red-200",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      bg: "bg-yellow-500/10 border-yellow-500/30",
      icon: "text-yellow-400",
      title: "text-yellow-300",
      message: "text-yellow-200",
      button: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
      bg: "bg-blue-500/10 border-blue-500/30",
      icon: "text-blue-400",
      title: "text-blue-300",
      message: "text-blue-200",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const style = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${style.bg} border backdrop-blur-lg rounded-2xl p-8 text-center max-w-md mx-auto ${className}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mb-6"
      >
        <AlertTriangle className={`w-16 h-16 ${style.icon} mx-auto`} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`text-xl font-bold ${style.title} mb-3`}
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`${style.message} mb-6 leading-relaxed`}
      >
        {message}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        {onAction && (
          <button
            onClick={onAction}
            className={`${style.button} text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        )}

        {showBackButton && (
          <button
            onClick={() => window.history.back()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        )}

        {showHomeButton && (
          <a
            href="/"
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </a>
        )}
      </motion.div>
    </motion.div>
  );
}

// Predefined error states for common scenarios
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      actionLabel="Retry"
      onAction={onRetry}
      variant="error"
    />
  );
}

export function NotFoundError({ resource = "page" }: { resource?: string }) {
  return (
    <ErrorState
      title={`${resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found`}
      message={`The ${resource} you're looking for doesn't exist or has been moved.`}
      showBackButton={true}
      variant="warning"
    />
  );
}

export function PermissionError() {
  return (
    <ErrorState
      title="Access Denied"
      message="You don't have permission to access this resource. Please contact an administrator if you believe this is an error."
      showBackButton={true}
      variant="error"
    />
  );
}

export function LoadingError({
  onRetry,
  resource = "data",
}: {
  onRetry?: () => void;
  resource?: string;
}) {
  return (
    <ErrorState
      title="Loading Failed"
      message={`Failed to load ${resource}. This might be a temporary issue.`}
      actionLabel="Reload"
      onAction={onRetry}
      variant="error"
    />
  );
}
