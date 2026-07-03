-- AlterTable
ALTER TABLE "users" ADD COLUMN     "monthly_wagered" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_wagered" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "razed_daily_wagers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razed_daily_wagers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_leaderboard_prizes" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "monthly_leaderboard_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_leaderboard_payouts" (
    "id" TEXT NOT NULL,
    "month_start" DATE NOT NULL,
    "user_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wagered" DECIMAL(14,2) NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_leaderboard_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "razed_daily_wagers_user_id_date_key" ON "razed_daily_wagers"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_leaderboard_prizes_position_key" ON "monthly_leaderboard_prizes"("position");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_leaderboard_payouts_month_start_user_id_key" ON "monthly_leaderboard_payouts"("month_start", "user_id");

-- AddForeignKey
ALTER TABLE "razed_daily_wagers" ADD CONSTRAINT "razed_daily_wagers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_leaderboard_payouts" ADD CONSTRAINT "monthly_leaderboard_payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

