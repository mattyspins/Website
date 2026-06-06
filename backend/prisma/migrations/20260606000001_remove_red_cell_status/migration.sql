-- AlterEnum
-- Remove unused 'RED' value from CellStatus (no rows have ever been set to RED)
ALTER TYPE "CellStatus" RENAME TO "CellStatus_old";
CREATE TYPE "CellStatus" AS ENUM ('EMPTY', 'ACTIVE', 'GREEN');
ALTER TABLE "bingo_cells" ALTER COLUMN "status" TYPE "CellStatus" USING "status"::text::"CellStatus";
DROP TYPE "CellStatus_old";
