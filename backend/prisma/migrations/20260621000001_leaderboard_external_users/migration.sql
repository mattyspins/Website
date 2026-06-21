-- Make user_id nullable (support unregistered/external players)
ALTER TABLE "leaderboard_wagers" ALTER COLUMN "user_id" DROP NOT NULL;

-- Add external_username for players not registered on the website
ALTER TABLE "leaderboard_wagers" ADD COLUMN "external_username" TEXT;
