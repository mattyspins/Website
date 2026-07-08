/*
  Warnings:

  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hunt_tracker_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "HighRollerStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "HighRollerPrediction" AS ENUM ('OVER', 'UNDER');

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "hunt_tracker_sessions" DROP CONSTRAINT "hunt_tracker_sessions_user_id_fkey";

-- DropIndex
DROP INDEX "idx_users_rainbet_username";

-- AlterTable
ALTER TABLE "stream_events" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "hunt_tracker_sessions";

-- CreateTable
CREATE TABLE "high_roller_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "threshold" DECIMAL(10,2) NOT NULL,
    "status" "HighRollerStatus" NOT NULL DEFAULT 'OPEN',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "round_locked" BOOLEAN NOT NULL DEFAULT false,
    "round_number" INTEGER NOT NULL DEFAULT 0,
    "final_round" BOOLEAN NOT NULL DEFAULT false,
    "treat_missed_as_wrong" BOOLEAN NOT NULL DEFAULT true,
    "join_keyword" TEXT NOT NULL DEFAULT '!join',
    "leave_keyword" TEXT NOT NULL DEFAULT '!leave',
    "over_keyword" TEXT NOT NULL DEFAULT '!over',
    "under_keyword" TEXT NOT NULL DEFAULT '!under',
    "suggest_keyword" TEXT DEFAULT '!suggest',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "high_roller_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_roller_players" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "user_id" TEXT,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "rounds_played" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "current_prediction" "HighRollerPrediction",
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "high_roller_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_roller_rounds" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "threshold" DECIMAL(10,2) NOT NULL,
    "slot_result" DECIMAL(10,2) NOT NULL,
    "winning_side" "HighRollerPrediction" NOT NULL,
    "number_over" INTEGER NOT NULL,
    "number_under" INTEGER NOT NULL,
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "high_roller_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_roller_round_predictions" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "prediction" "HighRollerPrediction",
    "correct" BOOLEAN NOT NULL,
    "streak_after" INTEGER NOT NULL,

    CONSTRAINT "high_roller_round_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "high_roller_suggestion_draws" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "drawn_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "high_roller_suggestion_draws_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "high_roller_players_session_id_kick_username_key" ON "high_roller_players"("session_id", "kick_username");

-- CreateIndex
CREATE UNIQUE INDEX "high_roller_round_predictions_round_id_player_id_key" ON "high_roller_round_predictions"("round_id", "player_id");

-- AddForeignKey
ALTER TABLE "high_roller_players" ADD CONSTRAINT "high_roller_players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "high_roller_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_roller_players" ADD CONSTRAINT "high_roller_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_roller_rounds" ADD CONSTRAINT "high_roller_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "high_roller_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_roller_round_predictions" ADD CONSTRAINT "high_roller_round_predictions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "high_roller_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_roller_round_predictions" ADD CONSTRAINT "high_roller_round_predictions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "high_roller_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "high_roller_suggestion_draws" ADD CONSTRAINT "high_roller_suggestion_draws_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "high_roller_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
