-- AlterTable
ALTER TABLE "slot_world_cups" ADD COLUMN     "nomination_command" TEXT NOT NULL DEFAULT '!wc';

-- AlterTable
ALTER TABLE "slot_world_cup_matches" DROP COLUMN "stats",
ADD COLUMN     "bet_amount_a" DECIMAL(12,2),
ADD COLUMN     "bet_amount_b" DECIMAL(12,2),
ADD COLUMN     "multiplier_a" DECIMAL(10,2),
ADD COLUMN     "multiplier_b" DECIMAL(10,2),
ADD COLUMN     "payout_amount_a" DECIMAL(14,2),
ADD COLUMN     "payout_amount_b" DECIMAL(14,2);

