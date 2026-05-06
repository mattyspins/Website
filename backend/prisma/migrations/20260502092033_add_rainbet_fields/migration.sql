/*
  Warnings:

  - A unique constraint covering the columns `[rainbet_username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rainbet_username" TEXT,
ADD COLUMN     "rainbet_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_rainbet_username_key" ON "users"("rainbet_username");

-- CreateIndex
CREATE INDEX "idx_users_rainbet_username" ON "users"("rainbet_username");
