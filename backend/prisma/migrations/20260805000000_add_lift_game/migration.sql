-- CreateEnum
CREATE TYPE "LiftStatus" AS ENUM ('JOIN', 'READY', 'ROUND_LOBBY', 'ROUND_DECISION', 'ROUND_LOCK', 'ROUND_PAUSE', 'ROUND_RESOLVE', 'FINALE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LiftRoundType" AS ENUM ('CHOICE', 'SYNC');

-- CreateTable
CREATE TABLE "lift_sessions" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "status" "LiftStatus" NOT NULL DEFAULT 'JOIN',
    "round" INTEGER NOT NULL DEFAULT 0,
    "join_keyword" TEXT NOT NULL DEFAULT '!join',
    "ready_keyword" TEXT NOT NULL DEFAULT '!ready',
    "phase_ends_at" TIMESTAMP(3),
    "caption" TEXT,
    "caption_sub" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "lift_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_players" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "user_id" TEXT,
    "avatar_url" TEXT,
    "avatar_seed" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMP(3),
    "alive" BOOLEAN NOT NULL DEFAULT true,
    "eliminated_round" INTEGER,
    "current_elevator" TEXT,

    CONSTRAINT "lift_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_rounds" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "type" "LiftRoundType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lift_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_elevators" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "required_count" INTEGER,
    "doomed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "final_count" INTEGER,

    CONSTRAINT "lift_elevators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lift_players_session_id_kick_username_key" ON "lift_players"("session_id", "kick_username");

-- CreateIndex
CREATE UNIQUE INDEX "lift_rounds_session_id_round_number_key" ON "lift_rounds"("session_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "lift_elevators_round_id_letter_key" ON "lift_elevators"("round_id", "letter");

-- AddForeignKey
ALTER TABLE "lift_players" ADD CONSTRAINT "lift_players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "lift_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_players" ADD CONSTRAINT "lift_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_rounds" ADD CONSTRAINT "lift_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "lift_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_elevators" ADD CONSTRAINT "lift_elevators_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "lift_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
