"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { SlotGame, Volatility, searchSlots, SLOT_GAMES } from "@/lib/slotGames";

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SlotImage({ src, name, size = 32 }: { src: string; name: string; size?: number }) {
  const [error, setError] = useState(!src);
  if (error || !src) {
    return (
      <div
        className="rounded-lg bg-white/10 flex items-center justify-center text-white/40 font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {name[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="rounded-lg object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export { SlotImage };

const VOLATILITY_STYLE: Record<Volatility, string> = {
  "Low":       "bg-green-500/15 text-green-400 border-green-500/25",
  "Medium":    "bg-blue-500/15 text-blue-300 border-blue-500/25",
  "High":      "bg-orange-500/15 text-orange-300 border-orange-500/25",
  "Very High": "bg-red-500/15 text-red-400 border-red-500/25",
};

export function VolatilityBadge({ volatility }: { volatility: Volatility }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 ${VOLATILITY_STYLE[volatility]}`}>
      {volatility}
    </span>
  );
}

// Curated one-tap shortcuts for the providers most requested on this stream (not
// necessarily the biggest by catalogue size) — the dropdown next to these covers
// every other provider in the full catalogue.
const PROVIDERS = [
  { label: "All", value: "" },
  { label: "Pragmatic", value: "Pragmatic Play" },
  { label: "Hacksaw", value: "Hacksaw Gaming" },
  { label: "NoLimit", value: "Nolimit City" },
  { label: "Push", value: "Push Gaming" },
  { label: "BTG", value: "BTG" },
  { label: "NetEnt", value: "NetEnt" },
  { label: "Relax", value: "Relax Gaming" },
];

export default function SlotPicker({ value, onChange, placeholder = "Search for a slot…", disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [sortAZ, setSortAZ] = useState(false);
  const [volFilter, setVolFilter] = useState<"" | "Low" | "Medium" | "High" | "Very High">("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered + sorted results
  const results = useMemo(() => {
    let list = searchSlots(query);
    if (provider) list = list.filter((g) => g.provider === provider);
    if (volFilter) list = list.filter((g) => g.volatility === volFilter);
    if (sortAZ) list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [query, provider, volFilter, sortAZ]);

  // Every provider in the catalogue (not just the curated quick-pick chips below),
  // alphabetical so the native select's type-ahead-by-letter jumps somewhere useful.
  const providerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of SLOT_GAMES) counts.set(g.provider, (counts.get(g.provider) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const selectedGame = useMemo(
    () => SLOT_GAMES.find((s) => s.name === value),
    [value]
  );

  // Is the typed text a custom entry (not in list)?
  const isCustom = query.trim() && !SLOT_GAMES.some(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelect = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  const pickRandom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pool = results.length > 0
      ? results
      : provider ? SLOT_GAMES.filter((g) => g.provider === provider) : SLOT_GAMES;
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const pick = pool[arr[0] % pool.length];
    handleSelect(pick.name);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={`flex items-center gap-2.5 w-full bg-white/5 border rounded-lg px-3 py-2.5 transition-colors ${
          open ? "border-yellow-400/50" : "border-white/10 hover:border-white/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
        onClick={() => !disabled && setOpen(true)}
      >
        {selectedGame && <SlotImage src={selectedGame.image} name={selectedGame.name} size={28} />}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm focus:outline-none min-w-0"
        />
        {query && (
          <button
            onClick={(e) => { e.stopPropagation(); setQuery(""); onChange(""); setOpen(true); }}
            className="text-white/30 hover:text-white/60 text-lg leading-none shrink-0"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 340 }}>

          {/* Provider filter: full-catalogue dropdown + curated quick-pick chips */}
          <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0">
            <div className="relative shrink-0">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Filter by provider"
                title="Filter by provider"
                style={{ colorScheme: "dark" }}
                className="appearance-none max-w-[132px] truncate text-[11px] font-semibold pl-2.5 pr-6 py-1 rounded-full border transition-colors cursor-pointer focus:outline-none focus:border-yellow-400/50 !bg-white/8 text-white/70 border-white/10 hover:!bg-white/15 hover:text-white"
              >
                <option value="" className="bg-[#111] text-white">All Providers</option>
                {providerCounts.map(([name, count]) => (
                  <option key={name} value={name} className="bg-[#111] text-white">{name} ({count})</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div
              className="flex gap-1.5 overflow-x-auto min-w-0 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.2) transparent" }}
            >
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={(e) => { e.stopPropagation(); setProvider(p.value); }}
                  className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                    provider === p.value
                      ? "bg-yellow-400 text-black"
                      : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volatility filter row */}
          <div className="flex gap-1.5 px-3 pb-1.5 shrink-0">
            {(["", "Low", "Medium", "High", "Very High"] as const).map((v) => (
              <button
                key={v}
                onClick={(e) => { e.stopPropagation(); setVolFilter(v); }}
                className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors border ${
                  volFilter === v
                    ? v === ""     ? "bg-white/20 text-white border-white/30"
                    : v === "Low"     ? "bg-green-500/30 text-green-300 border-green-500/50"
                    : v === "Medium"  ? "bg-blue-500/30 text-blue-300 border-blue-500/50"
                    : v === "High"    ? "bg-orange-500/30 text-orange-300 border-orange-500/50"
                    :                   "bg-red-500/30 text-red-300 border-red-500/50"
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {v === "" ? "All Vol." : v}
              </button>
            ))}
          </div>

          {/* Sort + Random row */}
          <div className="flex items-center gap-2 px-3 pb-2.5 border-b border-white/8 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setSortAZ((s) => !s); }}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                sortAZ
                  ? "bg-white/20 text-white"
                  : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
              }`}
            >
              A→Z
            </button>
            <button
              onClick={pickRandom}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/25 hover:bg-yellow-400/25 transition-colors ml-auto"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              Random
            </button>
          </div>

          {/* Results list */}
          <div className="overflow-y-auto flex-1">
            {/* Custom slot entry */}
            {isCustom && (
              <div
                onClick={() => handleSelect(query.trim())}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/8 border-b border-white/5"
              >
                <div className="w-9 h-9 rounded-lg bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center shrink-0 text-yellow-300 text-xs font-bold">
                  +
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-300 truncate">Use &quot;{query.trim()}&quot;</p>
                  <p className="text-xs text-white/35">Custom slot — not in list</p>
                </div>
              </div>
            )}

            {results.length === 0 && !isCustom ? (
              <div className="px-4 py-3 text-white/30 text-sm text-center">No slots found</div>
            ) : (
              results.map((game) => (
                <div
                  key={`${game.provider}-${game.name}`}
                  onClick={() => handleSelect(game.name)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/8 ${
                    value === game.name ? "bg-yellow-400/10" : ""
                  }`}
                >
                  <SlotImage src={game.image} name={game.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${value === game.name ? "text-yellow-300" : "text-white"}`}>
                      {game.name}
                    </p>
                    <p className="text-xs text-white/35 truncate">{game.provider}</p>
                  </div>
                  <VolatilityBadge volatility={game.volatility} />
                  {value === game.name && <span className="text-yellow-400 shrink-0 text-sm">✓</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
