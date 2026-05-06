-- CreateEnum
CREATE TYPE "GuessTheBalanceStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "guess_the_balance" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "starting_balance" DECIMAL(12,2) NOT NULL,
    "number_of_bonuses" INTEGER NOT NULL,
    "break_even_multiplier" DECIMAL(6,2) NOT NULL,
    "final_balance" DECIMAL(12,2),
    "status" "GuessTheBalanceStatus" NOT NULL DEFAULT 'DRAFT',
    "winner_id" TEXT,
    "winner_guess" DECIMAL(12,2),
    "winner_reward" INTEGER DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "guess_the_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guess_submissions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guess_amount" DECIMAL(12,2) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guess_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guess_the_balance_status_idx" ON "guess_the_balance"("status");

-- CreateIndex
CREATE INDEX "guess_the_balance_created_by_idx" ON "guess_the_balance"("created_by");

-- CreateIndex
CREATE INDEX "guess_submissions_game_id_idx" ON "guess_submissions"("game_id");

-- CreateIndex
CREATE INDEX "guess_submissions_user_id_idx" ON "guess_submissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guess_submissions_game_id_user_id_key" ON "guess_submissions"("game_id", "user_id");

-- AddForeignKey
ALTER TABLE "guess_the_balance" ADD CONSTRAINT "guess_the_balance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guess_the_balance" ADD CONSTRAINT "guess_the_balance_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guess_submissions" ADD CONSTRAINT "guess_submissions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "guess_the_balance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guess_submissions" ADD CONSTRAINT "guess_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
