"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular" | "rounded";
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export default function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const baseClasses =
    "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]";

  const variantClasses = {
    text: "rounded-sm h-4",
    rectangular: "rounded-lg",
    circular: "rounded-full",
    rounded: "rounded-xl",
  };

  const animationClasses = animate ? "animate-pulse" : "";

  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || (variant === "text" ? "1rem" : "auto"),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses} ${className}`}
      style={style}
    />
  );
}

// Predefined skeleton components for common use cases
export function TextSkeleton({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? "75%" : "100%"}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-black/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <TextSkeleton lines={3} />
      <div className="flex space-x-3 mt-4">
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={100} height={32} variant="rounded" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-black/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="border-b border-gray-700/50 p-4">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} variant="text" width="80%" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-700/50">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  variant="text"
                  width={colIndex === 0 ? "90%" : "70%"}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width="40%" />
        <Skeleton width={60} height={24} variant="rounded" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="25%" />
        </div>
        <div className="flex justify-between">
          <Skeleton variant="text" width="35%" />
          <Skeleton variant="text" width="20%" />
        </div>
        <div className="flex justify-between">
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>

      <div className="flex space-x-3">
        <Skeleton width="100%" height={40} variant="rounded" />
        <Skeleton width={80} height={40} variant="rounded" />
      </div>
    </div>
  );
}
