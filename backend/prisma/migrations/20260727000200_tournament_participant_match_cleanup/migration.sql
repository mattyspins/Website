-- Slot is locked in at registration now, so the post-draw per-participant
-- and per-match slot-confirmation workflow (and its fields) no longer apply.
ALTER TABLE "tournament_participants"
  DROP COLUMN "slot_confirmed",
  DROP COLUMN "slot_deadline";

ALTER TABLE "tournament_matches" DROP COLUMN "slot_deadline";

-- result_text replaces the old client-only cost/payout calculator: the
-- admin now types a match's result directly and it's persisted server-side.
ALTER TABLE "tournament_match_participants"
  DROP COLUMN "slot_confirmed",
  DROP COLUMN "slot_confirmed_at",
  ADD COLUMN "result_text" TEXT;
