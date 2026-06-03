"use client";

import { useState, useRef, useEffect } from "react";
import { SlotGame, Volatility, searchSlots } from "@/lib/slotGames";

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SlotImage({ src, name, size = 32 }: { src: string; name: string; size?: number }) {
  const [error, setError] = useState(!src); // immediately fall back if no URL
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

export default function SlotPicker({ value, onChange, placeholder = "Search for a slot…", disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SlotGame[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResults(searchSlots(query));
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedGame = results.find((s) => s.name === value) || searchSlots("").find((s) => s.name === value);

  const handleSelect = (game: SlotGame) => {
    onChange(game.name);
    setQuery(game.name);
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
        {selectedGame && (
          <SlotImage src={selectedGame.image} name={selectedGame.name} size={28} />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
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
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-white/30 text-sm text-center">No slots found</div>
          ) : (
            results.map((game) => (
              <div
                key={game.name}
                onClick={() => handleSelect(game)}
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
      )}
    </div>
  );
}
