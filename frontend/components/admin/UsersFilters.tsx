"use client";

import { Search } from "lucide-react";

export interface UserFilterState {
  role: "all" | "admin" | "moderator" | "vip" | "depositor" | "suspended";
  razed: "all" | "verified" | "unverified";
  minPoints: string;
  maxPoints: string;
}

interface UsersFiltersProps {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearchSubmit: () => void;
  filters: UserFilterState;
  onFiltersChange: (f: UserFilterState) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

const ROLE_OPTIONS: { value: UserFilterState["role"]; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admins" },
  { value: "moderator", label: "Moderators" },
  { value: "vip", label: "VIP" },
  { value: "depositor", label: "Depositors" },
  { value: "suspended", label: "Suspended" },
];

const RAZED_OPTIONS: { value: UserFilterState["razed"]; label: string }[] = [
  { value: "all", label: "Any Razed Status" },
  { value: "verified", label: "Razed Verified" },
  { value: "unverified", label: "Razed Not Verified" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Date Joined" },
  { value: "lastActiveAt", label: "Last Active" },
  { value: "points", label: "Points" },
  { value: "displayName", label: "Name" },
  { value: "totalWagered", label: "Total Wagered" },
];

export default function UsersFilters({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  filters,
  onFiltersChange,
  sortBy,
  sortOrder,
  onSortChange,
}: UsersFiltersProps) {
  return (
    <div className="bg-navy-800/60 border border-white/6 rounded-xl p-4 space-y-3">
      <form
        onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Search by name, Kick or Discord ID…"
            className="w-full pl-9 pr-4 py-2.5 bg-navy-900/60 border border-white/8 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold-500/40"
          />
        </div>
        <button
          type="submit"
          className="bg-gold-600 hover:bg-gold-700 text-navy-950 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.role}
          onChange={(e) => onFiltersChange({ ...filters, role: e.target.value as UserFilterState["role"] })}
          className="bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40"
        >
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.razed}
          onChange={(e) => onFiltersChange({ ...filters, razed: e.target.value as UserFilterState["razed"] })}
          className="bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40"
        >
          {RAZED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input
          type="number"
          value={filters.minPoints}
          onChange={(e) => onFiltersChange({ ...filters, minPoints: e.target.value })}
          placeholder="Min points"
          className="w-28 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold-500/40"
        />
        <input
          type="number"
          value={filters.maxPoints}
          onChange={(e) => onFiltersChange({ ...filters, maxPoints: e.target.value })}
          placeholder="Max points"
          className="w-28 bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gold-500/40"
        />

        <div className="flex-1" />

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value, sortOrder)}
          className="bg-navy-900/60 border border-white/8 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
        </select>
        <button
          onClick={() => onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc")}
          className="bg-white/6 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          title="Toggle sort direction"
        >
          {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
      </div>
    </div>
  );
}
