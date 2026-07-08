"use client";

import { useState } from "react";
import { Coins, X } from "lucide-react";
import AdjustPointsModal from "./AdjustPointsModal";

interface UsersBulkActionsProps {
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
}

export default function UsersBulkActions({ selectedIds, onClear, onDone }: UsersBulkActionsProps) {
  const [showModal, setShowModal] = useState(false);

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-10 bg-gold-500/10 border border-gold-500/25 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-gold-300 text-sm font-semibold">
          {selectedIds.length} user{selectedIds.length !== 1 ? "s" : ""} selected
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
          >
            <Coins className="w-3.5 h-3.5" /> Adjust Points
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 bg-white/6 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {showModal && (
        <AdjustPointsModal
          userIds={selectedIds}
          userLabel={`${selectedIds.length} users`}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); onClear(); onDone(); }}
        />
      )}
    </>
  );
}
