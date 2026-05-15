-- Add totalDeposited and lastDailyCheckIn to users
ALTER TABLE "users" ADD COLUMN "total_deposited" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "last_daily_check_in" TIMESTAMP(3);

-- StreamEvent table
CREATE TABLE "stream_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "game_type" TEXT,
    "description" TEXT,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stream_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stream_events_scheduled_at_idx" ON "stream_events"("scheduled_at");

-- MilestoneClaim table
CREATE TABLE "milestone_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier_id" INTEGER NOT NULL,
    "tier_name" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "milestone_claims_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "milestone_claims" ADD CONSTRAINT "milestone_claims_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestone_claims" ADD CONSTRAINT "milestone_claims_user_id_tier_id_key"
    UNIQUE ("user_id", "tier_id");
