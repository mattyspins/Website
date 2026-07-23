-- AlterTable: split the single wager-race leaderboard into independent
-- Weekly and Monthly races. Existing rows (including the currently-live
-- race) default to 'MONTHLY' so today's leaderboard carries forward
-- unchanged; the admin can separately create a Weekly race afterward.
ALTER TABLE "wager_races" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'MONTHLY';

-- DropIndex
DROP INDEX "wager_races_status_start_date_end_date_idx";

-- CreateIndex
CREATE INDEX "wager_races_type_status_start_date_end_date_idx" ON "wager_races"("type", "status", "start_date", "end_date");
