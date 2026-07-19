-- CreateEnum
CREATE TYPE "SlotWorldCupStatus" AS ENUM ('NOMINATION', 'BRACKET_SET', 'PREDICTIONS_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SlotWorldCupSeeding" AS ENUM ('RANDOM', 'POPULARITY');

-- CreateTable
CREATE TABLE "slot_world_cups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 8,
    "status" "SlotWorldCupStatus" NOT NULL DEFAULT 'NOMINATION',
    "nominations_open" BOOLEAN NOT NULL DEFAULT true,
    "seeding" "SlotWorldCupSeeding" NOT NULL DEFAULT 'RANDOM',
    "current_round" INTEGER NOT NULL DEFAULT 0,
    "total_rounds" INTEGER NOT NULL,
    "scoring_config" JSONB NOT NULL,
    "reward_config" JSONB NOT NULL,
    "champion_slot_id" TEXT,
    "runner_up_slot_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "slot_world_cups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_world_cup_nominations" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "slot_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_world_cup_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_world_cup_slots" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "slot_name" TEXT NOT NULL,
    "provider" TEXT,
    "image_url" TEXT,
    "seed" INTEGER NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "eliminated_round" INTEGER,

    CONSTRAINT "slot_world_cup_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_world_cup_matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "match_number" INTEGER NOT NULL,
    "slot_a_id" TEXT,
    "slot_b_id" TEXT,
    "winner_id" TEXT,
    "next_match_id" TEXT,
    "next_match_slot" TEXT,
    "stats" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_world_cup_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_world_cup_predictions" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "picks" JSONB NOT NULL,
    "champion_pick_id" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct_picks" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_world_cup_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slot_world_cup_nominations_tournament_id_normalized_name_idx" ON "slot_world_cup_nominations"("tournament_id", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "slot_world_cup_nominations_tournament_id_kick_username_key" ON "slot_world_cup_nominations"("tournament_id", "kick_username");

-- CreateIndex
CREATE UNIQUE INDEX "slot_world_cup_slots_tournament_id_seed_key" ON "slot_world_cup_slots"("tournament_id", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "slot_world_cup_matches_tournament_id_round_match_number_key" ON "slot_world_cup_matches"("tournament_id", "round", "match_number");

-- CreateIndex
CREATE UNIQUE INDEX "slot_world_cup_predictions_tournament_id_user_id_key" ON "slot_world_cup_predictions"("tournament_id", "user_id");

-- AddForeignKey
ALTER TABLE "slot_world_cups" ADD CONSTRAINT "slot_world_cups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_nominations" ADD CONSTRAINT "slot_world_cup_nominations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "slot_world_cups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_slots" ADD CONSTRAINT "slot_world_cup_slots_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "slot_world_cups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_matches" ADD CONSTRAINT "slot_world_cup_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "slot_world_cups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_matches" ADD CONSTRAINT "slot_world_cup_matches_slot_a_id_fkey" FOREIGN KEY ("slot_a_id") REFERENCES "slot_world_cup_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_matches" ADD CONSTRAINT "slot_world_cup_matches_slot_b_id_fkey" FOREIGN KEY ("slot_b_id") REFERENCES "slot_world_cup_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_matches" ADD CONSTRAINT "slot_world_cup_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "slot_world_cup_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_predictions" ADD CONSTRAINT "slot_world_cup_predictions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "slot_world_cups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_world_cup_predictions" ADD CONSTRAINT "slot_world_cup_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

