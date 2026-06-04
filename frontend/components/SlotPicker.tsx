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

// Provider filter chips — ordered by catalogue size
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered results
  const results = useMemo(() => {
    let list = searchSlots(query);
    if (provider) list = list.filter((g) => g.provider === provider);
    return list;
  }, [query, provider]);

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

          {/* Provider filter chips */}
          <div className="flex gap-1.5 px-3 py-2.5 border-b border-white/8 overflow-x-auto no-scrollbar shrink-0">
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
