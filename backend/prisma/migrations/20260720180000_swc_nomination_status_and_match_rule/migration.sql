-- CreateEnum
CREATE TYPE "SlotWorldCupNominationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "slot_world_cups" ADD COLUMN     "match_rule" TEXT NOT NULL DEFAULT 'Bonus Buy';

-- AlterTable
ALTER TABLE "slot_world_cup_nominations" ADD COLUMN     "status" "SlotWorldCupNominationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "slot_world_cup_nominations_tournament_id_status_idx" ON "slot_world_cup_nominations"("tournament_id", "status");

