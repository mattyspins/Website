-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'SLOT_SELECTION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'SLOT_SELECTION', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "max_players" INTEGER NOT NULL DEFAULT 8,
    "slot_timer_seconds" INTEGER NOT NULL DEFAULT 180,
    "current_round" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seed" INTEGER,
    "current_slot" TEXT,
    "slot_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "slot_deadline" TIMESTAMP(3),
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "final_position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "match_number" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "winner_id" TEXT,
    "next_match_id" TEXT,
    "slot_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_match_participants" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "slot_call" TEXT,
    "slot_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "slot_confirmed_at" TIMESTAMP(3),

    CONSTRAINT "tournament_match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_user_id_key" ON "tournament_participants"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_tournament_id_user_id_key" ON "tournament_entries"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_matches_tournament_id_round_match_number_key" ON "tournament_matches"("tournament_id", "round", "match_number");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_match_participants_match_id_participant_id_key" ON "tournament_match_participants"("match_id", "participant_id");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_match_participants" ADD CONSTRAINT "tournament_match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "tournament_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_match_participants" ADD CONSTRAINT "tournament_match_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
