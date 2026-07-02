-- CreateEnum
CREATE TYPE "KingOfTheHillStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "KothEntryStatus" AS ENUM ('WAITING', 'DRAWN', 'KING');

-- CreateTable
CREATE TABLE "king_of_the_hill_sessions" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "status" "KingOfTheHillStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "king_of_the_hill_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "king_of_the_hill_entries" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "KothEntryStatus" NOT NULL DEFAULT 'WAITING',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drawn_at" TIMESTAMP(3),

    CONSTRAINT "king_of_the_hill_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "king_of_the_hill_rounds" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_name" TEXT,
    "bet_amount" DECIMAL(10,2),
    "payout_amount" DECIMAL(10,2),
    "multiplier" DECIMAL(6,2),
    "is_king" BOOLEAN NOT NULL DEFAULT false,
    "drawn_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot_called_at" TIMESTAMP(3),
    "played_at" TIMESTAMP(3),
    "dethroned_at" TIMESTAMP(3),

    CONSTRAINT "king_of_the_hill_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "king_of_the_hill_entries_session_id_user_id_key" ON "king_of_the_hill_entries"("session_id", "user_id");

-- AddForeignKey
ALTER TABLE "king_of_the_hill_entries" ADD CONSTRAINT "king_of_the_hill_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "king_of_the_hill_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "king_of_the_hill_entries" ADD CONSTRAINT "king_of_the_hill_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "king_of_the_hill_rounds" ADD CONSTRAINT "king_of_the_hill_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "king_of_the_hill_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "king_of_the_hill_rounds" ADD CONSTRAINT "king_of_the_hill_rounds_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "king_of_the_hill_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "king_of_the_hill_rounds" ADD CONSTRAINT "king_of_the_hill_rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

