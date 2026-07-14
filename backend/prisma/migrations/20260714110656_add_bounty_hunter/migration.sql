-- CreateEnum
CREATE TYPE "BountyHunterStatus" AS ENUM ('REGISTRATION', 'ACTIVE', 'SETTLED');

-- CreateEnum
CREATE TYPE "BountyHunterEntryStatus" AS ENUM ('WAITING', 'DRAWN', 'DONE');

-- CreateTable
CREATE TABLE "bounty_hunters" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "status" "BountyHunterStatus" NOT NULL DEFAULT 'REGISTRATION',
    "registration_open" BOOLEAN NOT NULL DEFAULT true,
    "target" INTEGER NOT NULL,
    "claim_zone" INTEGER NOT NULL DEFAULT 25,
    "pot" INTEGER NOT NULL DEFAULT 5000,
    "rollover_count" INTEGER NOT NULL DEFAULT 0,
    "epoch" INTEGER NOT NULL DEFAULT 0,
    "winner_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "bounty_hunters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounty_hunter_entries" (
    "id" TEXT NOT NULL,
    "hunt_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "user_id" TEXT,
    "slot_name" TEXT,
    "status" "BountyHunterEntryStatus" NOT NULL DEFAULT 'WAITING',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drawn_at" TIMESTAMP(3),

    CONSTRAINT "bounty_hunter_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounty_hunter_rounds" (
    "id" TEXT NOT NULL,
    "hunt_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT,
    "epoch" INTEGER NOT NULL,
    "slot_name" TEXT,
    "bet_amount" DECIMAL(10,2),
    "payout_amount" DECIMAL(10,2),
    "multiplier" DECIMAL(10,2),
    "distance" INTEGER,
    "qualifies" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "drawn_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot_called_at" TIMESTAMP(3),
    "played_at" TIMESTAMP(3),

    CONSTRAINT "bounty_hunter_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bounty_hunter_entries_hunt_id_kick_username_key" ON "bounty_hunter_entries"("hunt_id", "kick_username");

-- AddForeignKey
ALTER TABLE "bounty_hunters" ADD CONSTRAINT "bounty_hunters_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_hunter_entries" ADD CONSTRAINT "bounty_hunter_entries_hunt_id_fkey" FOREIGN KEY ("hunt_id") REFERENCES "bounty_hunters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_hunter_entries" ADD CONSTRAINT "bounty_hunter_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_hunter_rounds" ADD CONSTRAINT "bounty_hunter_rounds_hunt_id_fkey" FOREIGN KEY ("hunt_id") REFERENCES "bounty_hunters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_hunter_rounds" ADD CONSTRAINT "bounty_hunter_rounds_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "bounty_hunter_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_hunter_rounds" ADD CONSTRAINT "bounty_hunter_rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

