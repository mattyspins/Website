-- Add Kick OAuth fields to users table
ALTER TABLE "users" ADD COLUMN "kick_id" TEXT;
ALTER TABLE "users" ADD COLUMN "kick_access_token" TEXT;
ALTER TABLE "users" ADD COLUMN "kick_refresh_token" TEXT;
ALTER TABLE "users" ADD COLUMN "kick_token_expires_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "is_moderator" BOOLEAN NOT NULL DEFAULT false;

-- Create unique constraints for Kick OAuth fields
CREATE UNIQUE INDEX "users_kick_id_key" ON "users"("kick_id");

-- Create leaderboards table for manual leaderboard system
CREATE TABLE "leaderboards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "prize_pool" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- Create leaderboard_prizes table
CREATE TABLE "leaderboard_prizes" (
    "id" TEXT NOT NULL,
    "leaderboard_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prize_amount" TEXT NOT NULL,
    "prize_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_prizes_pkey" PRIMARY KEY ("id")
);

-- Create leaderboard_wagers table
CREATE TABLE "leaderboard_wagers" (
    "id" TEXT NOT NULL,
    "leaderboard_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wager_amount" DECIMAL(12,2) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "leaderboard_wagers_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for leaderboard prizes
CREATE UNIQUE INDEX "leaderboard_prizes_leaderboard_id_position_key" ON "leaderboard_prizes"("leaderboard_id", "position");

-- Create indexes for performance
CREATE INDEX "idx_users_kick_id" ON "users"("kick_id");
CREATE INDEX "idx_users_kick_username" ON "users"("kick_username");
CREATE INDEX "idx_leaderboard_wagers_leaderboard_user" ON "leaderboard_wagers"("leaderboard_id", "user_id");
CREATE INDEX "idx_leaderboards_status_dates" ON "leaderboards"("status", "start_date", "end_date");

-- Add foreign key constraints
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leaderboard_prizes" ADD CONSTRAINT "leaderboard_prizes_leaderboard_id_fkey" FOREIGN KEY ("leaderboard_id") REFERENCES "leaderboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leaderboard_wagers" ADD CONSTRAINT "leaderboard_wagers_leaderboard_id_fkey" FOREIGN KEY ("leaderboard_id") REFERENCES "leaderboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leaderboard_wagers" ADD CONSTRAINT "leaderboard_wagers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add missing raffle fields
ALTER TABLE "raffles" ADD COLUMN "max_entries_per_user" INTEGER NOT NULL DEFAULT -1;
ALTER TABLE "raffles" ADD COLUMN "number_of_winners" INTEGER NOT NULL DEFAULT 1;