-- CreateEnum
CREATE TYPE "BossRaidStatus" AS ENUM ('REGISTRATION', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BossRaidEntryStatus" AS ENUM ('WAITING', 'DRAWN', 'DONE');

-- CreateTable
CREATE TABLE "boss_raids" (
    "id" TEXT NOT NULL,
    "boss_key" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "status" "BossRaidStatus" NOT NULL DEFAULT 'REGISTRATION',
    "max_hp" INTEGER NOT NULL DEFAULT 10000,
    "current_hp" INTEGER NOT NULL DEFAULT 10000,
    "phase" INTEGER NOT NULL DEFAULT 1,
    "rage" INTEGER NOT NULL DEFAULT 0,
    "round_count" INTEGER NOT NULL DEFAULT 0,
    "consecutive_bucket" TEXT,
    "consecutive_count" INTEGER NOT NULL DEFAULT 0,
    "legendary_buff_rounds" INTEGER NOT NULL DEFAULT 0,
    "soul_shields" INTEGER NOT NULL DEFAULT 3,
    "void_modifier" TEXT,
    "void_modifier_rounds_left" INTEGER NOT NULL DEFAULT 0,
    "defeated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "boss_raids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boss_raid_entries" (
    "id" TEXT NOT NULL,
    "raid_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "BossRaidEntryStatus" NOT NULL DEFAULT 'WAITING',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drawn_at" TIMESTAMP(3),

    CONSTRAINT "boss_raid_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boss_raid_rounds" (
    "id" TEXT NOT NULL,
    "raid_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT,
    "slot_name" TEXT,
    "bet_amount" DECIMAL(10,2),
    "payout_amount" DECIMAL(10,2),
    "multiplier" DECIMAL(8,2),
    "damage_dealt" INTEGER NOT NULL DEFAULT 0,
    "heal_applied" INTEGER NOT NULL DEFAULT 0,
    "is_dead_bonus" BOOLEAN NOT NULL DEFAULT false,
    "is_retrigger" BOOLEAN NOT NULL DEFAULT false,
    "is_crit" BOOLEAN NOT NULL DEFAULT false,
    "is_legendary" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "drawn_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot_called_at" TIMESTAMP(3),
    "played_at" TIMESTAMP(3),

    CONSTRAINT "boss_raid_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boss_raid_entries_raid_id_kick_username_key" ON "boss_raid_entries"("raid_id", "kick_username");

-- AddForeignKey
ALTER TABLE "boss_raids" ADD CONSTRAINT "boss_raids_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_raid_entries" ADD CONSTRAINT "boss_raid_entries_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "boss_raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_raid_entries" ADD CONSTRAINT "boss_raid_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_raid_rounds" ADD CONSTRAINT "boss_raid_rounds_raid_id_fkey" FOREIGN KEY ("raid_id") REFERENCES "boss_raids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_raid_rounds" ADD CONSTRAINT "boss_raid_rounds_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "boss_raid_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boss_raid_rounds" ADD CONSTRAINT "boss_raid_rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

