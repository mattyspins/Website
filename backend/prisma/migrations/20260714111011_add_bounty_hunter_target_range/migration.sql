-- AlterTable
ALTER TABLE "bounty_hunters" ADD COLUMN     "target_max" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "target_min" INTEGER NOT NULL DEFAULT 50;

