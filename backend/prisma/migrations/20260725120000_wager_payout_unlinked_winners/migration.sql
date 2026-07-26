-- Unlinked Razed wagerers can place in the money too. Before this, a payout row
-- required a linked site account, so an unlinked winner was skipped entirely and
-- their position just went missing from the payout history.

ALTER TABLE "wager_race_payouts" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "wager_race_payouts" ADD COLUMN "razed_username" TEXT;

-- Postgres treats NULLs as distinct in unique indexes, so these two constraints
-- coexist: linked winners are deduped on user_id, unlinked on razed_username.
CREATE UNIQUE INDEX "wager_race_payouts_race_id_razed_username_key"
  ON "wager_race_payouts" ("race_id", "razed_username");
