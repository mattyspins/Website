-- DropForeignKey
ALTER TABLE "leaderboard_entries" DROP CONSTRAINT "leaderboard_entries_user_id_fkey";

-- DropForeignKey
ALTER TABLE "leaderboard_prizes" DROP CONSTRAINT "leaderboard_prizes_leaderboard_id_fkey";

-- DropForeignKey
ALTER TABLE "leaderboard_wagers" DROP CONSTRAINT "leaderboard_wagers_leaderboard_id_fkey";

-- DropForeignKey
ALTER TABLE "leaderboard_wagers" DROP CONSTRAINT "leaderboard_wagers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "leaderboards" DROP CONSTRAINT "leaderboards_created_by_fkey";

-- DropTable
DROP TABLE "leaderboard_entries";

-- DropTable
DROP TABLE "leaderboard_prizes";

-- DropTable
DROP TABLE "leaderboard_wagers";

-- DropTable
DROP TABLE "leaderboards";

