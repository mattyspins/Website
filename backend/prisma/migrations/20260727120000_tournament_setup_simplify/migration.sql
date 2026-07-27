-- Admin feedback after using the new Setup tab live: registration open/close
-- is a manual admin action, not something worth scheduling in advance, and
-- the eligible-slots curation / scoring-method / spins-per-match fields
-- added no real value (the first was extra admin busywork for no fairness
-- benefit — any slot name is fine at registration, same permissive pattern
-- Bonus Bingo already uses; the other two were purely descriptive and never
-- drove any logic). Drop all five.
ALTER TABLE "tournaments"
  DROP COLUMN "registration_opens_at",
  DROP COLUMN "registration_closes_at",
  DROP COLUMN "scoring_method",
  DROP COLUMN "spins_per_match",
  DROP COLUMN "eligible_slots";

DROP TYPE "TournamentScoringMethod";
