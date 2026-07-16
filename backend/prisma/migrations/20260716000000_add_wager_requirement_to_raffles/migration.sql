-- Add wager requirement fields to raffles table
ALTER TABLE "public"."raffles" 
ADD COLUMN "min_wager_requirement" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "wager_days" INTEGER NOT NULL DEFAULT 7;

-- Add comment for documentation
COMMENT ON COLUMN "public"."raffles"."min_wager_requirement" IS 'Minimum wager amount required in the past X days to enter raffle';
COMMENT ON COLUMN "public"."raffles"."wager_days" IS 'Number of days to look back for wager requirement (default 7)';
