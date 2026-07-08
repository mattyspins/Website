-- AlterEnum
-- Remove unused 'RED' value from CellStatus (no rows have ever been set to RED)
ALTER TYPE "CellStatus" RENAME TO "CellStatus_old";
CREATE TYPE "CellStatus" AS ENUM ('EMPTY', 'ACTIVE', 'GREEN');
-- The column's existing default is tied to the old enum type, so it must be dropped
-- before the type change (Postgres can't auto-cast a column default) and re-added after.
ALTER TABLE "bingo_cells" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bingo_cells" ALTER COLUMN "status" TYPE "CellStatus" USING "status"::text::"CellStatus";
ALTER TABLE "bingo_cells" ALTER COLUMN "status" SET DEFAULT 'EMPTY'::"CellStatus";
DROP TYPE "CellStatus_old";
