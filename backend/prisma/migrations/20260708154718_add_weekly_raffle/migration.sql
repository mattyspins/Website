-- CreateEnum
CREATE TYPE "WeeklyRaffleStatus" AS ENUM ('OPEN', 'DRAWN');

-- CreateTable
CREATE TABLE "weekly_raffles" (
    "id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "status" "WeeklyRaffleStatus" NOT NULL DEFAULT 'OPEN',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "winner_user_id" TEXT,
    "elimination_order" JSONB,
    "eligible_count" INTEGER,
    "drawn_at" TIMESTAMP(3),
    "drawn_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "weekly_raffles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_raffles_week_start_key" ON "weekly_raffles"("week_start");

-- AddForeignKey
ALTER TABLE "weekly_raffles" ADD CONSTRAINT "weekly_raffles_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_raffles" ADD CONSTRAINT "weekly_raffles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_raffles" ADD CONSTRAINT "weekly_raffles_drawn_by_fkey" FOREIGN KEY ("drawn_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
