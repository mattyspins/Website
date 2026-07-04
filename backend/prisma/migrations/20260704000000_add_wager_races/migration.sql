-- CreateTable
CREATE TABLE "wager_races" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wager_races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wager_race_prizes" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "wager_race_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wager_race_payouts" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wagered" DECIMAL(14,2) NOT NULL,
    "prize_amount" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wager_race_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wager_races_status_start_date_end_date_idx" ON "wager_races"("status", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "wager_race_prizes_race_id_position_key" ON "wager_race_prizes"("race_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "wager_race_payouts_race_id_user_id_key" ON "wager_race_payouts"("race_id", "user_id");

-- AddForeignKey
ALTER TABLE "wager_race_prizes" ADD CONSTRAINT "wager_race_prizes_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "wager_races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wager_race_payouts" ADD CONSTRAINT "wager_race_payouts_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "wager_races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wager_race_payouts" ADD CONSTRAINT "wager_race_payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: carry the in-progress July 2026 race (currently tracked via the
-- global monthly_leaderboard_prizes table) forward into the new per-race model,
-- so it keeps running under admin control with no gap in standings.
DO $$
DECLARE
  new_race_id TEXT := '5fe1a010-6f28-44fa-8ffd-92947c79a391';
BEGIN
  IF EXISTS (SELECT 1 FROM "monthly_leaderboard_prizes") THEN
    INSERT INTO "wager_races" ("id", "start_date", "end_date", "status", "created_at")
    VALUES (new_race_id, '2026-07-01', '2026-07-31', 'active', CURRENT_TIMESTAMP);

    INSERT INTO "wager_race_prizes" ("id", "race_id", "position", "amount")
    SELECT (md5(random()::text || clock_timestamp()::text))::uuid::text, new_race_id, "position", "points"
    FROM "monthly_leaderboard_prizes";
  END IF;
END $$;

-- DropTable
-- monthly_leaderboard_payouts has never recorded a payout (no calendar month has
-- completed since Razed tracking launched), so this drops no historical data.
DROP TABLE "monthly_leaderboard_payouts";

-- DropTable
DROP TABLE "monthly_leaderboard_prizes";
