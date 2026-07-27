-- Tournament revamp: slot is now chosen at registration instead of after the
-- draw, so the tournament needs a curated eligible-slot list, a scheduled
-- registration window, display-only scoring/prize config, and a commit-reveal
-- draw seed (published as a hash the moment registration locks, revealed once
-- the draw actually runs, so the outcome can be verified afterwards).

CREATE TYPE "TournamentScoringMethod" AS ENUM ('TOTAL_MULTIPLIER', 'HIGHEST_SINGLE_WIN', 'FINAL_BALANCE');
CREATE TYPE "TournamentEntrySource" AS ENUM ('WEB', 'CHAT');

ALTER TABLE "tournaments"
  ADD COLUMN "registration_opens_at" TIMESTAMP(3),
  ADD COLUMN "registration_closes_at" TIMESTAMP(3),
  ADD COLUMN "allow_duplicate_slots" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "eligible_slots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "scoring_method" "TournamentScoringMethod" NOT NULL DEFAULT 'TOTAL_MULTIPLIER',
  ADD COLUMN "spins_per_match" INTEGER DEFAULT 5,
  ADD COLUMN "bet_amount_per_spin" DECIMAL(10,2),
  ADD COLUMN "prize_pool_display" TEXT,
  ADD COLUMN "seed_commitment_hash" TEXT,
  ADD COLUMN "draw_seed" TEXT,
  ADD COLUMN "draw_executed_at" TIMESTAMP(3),
  ADD COLUMN "draw_result" JSONB;

-- The old post-draw per-participant slot-confirmation countdown no longer
-- exists now that slot is locked in at entry time.
ALTER TABLE "tournaments" DROP COLUMN "slot_timer_seconds";

-- Nullable at the DB level so historical (pre-revamp) rows don't need a
-- backfill; every entry created from now on always sets slot/source in
-- application code.
ALTER TABLE "tournament_entries"
  ADD COLUMN "slot" TEXT,
  ADD COLUMN "source" "TournamentEntrySource" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "invalidated" BOOLEAN NOT NULL DEFAULT false;
