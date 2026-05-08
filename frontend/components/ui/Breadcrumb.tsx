"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center"
      >
        <Link
          href="/"
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
      </motion.div>

      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center space-x-2"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />

          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center space-x-1 text-white font-medium">
              {item.icon && <item.icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </span>
          )}
        </motion.div>
      ))}
    </nav>
  );
}

// Utility function to generate breadcrumbs from pathname
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Map of path segments to readable labels
  const labelMap: Record<string, string> = {
    admin: "Admin Dashboard",
    moderator: "Moderator Dashboard",
    leaderboard: "Leaderboards",
    leaderboards: "Leaderboards",
    "bonus-hunt": "Bonus Hunt",
    "guess-the-balance": "Guess the Balance",
    store: "Store",
    raffle: "Raffles",
    profile: "Profile",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    "responsible-gaming": "Responsible Gaming",
    "audit-logs": "Audit Logs",
  };

  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Skip dynamic route segments (like [id])
    if (segment.startsWith("[") && segment.endsWith("]")) {
      return;
    }

    breadcrumbs.push({
      label:
        labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}
