-- CreateTable
CREATE TABLE "razed_unlinked_wagers" (
    "id" TEXT NOT NULL,
    "razed_username" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razed_unlinked_wagers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "razed_unlinked_wagers_razed_username_idx" ON "razed_unlinked_wagers"("razed_username");

-- CreateIndex
CREATE UNIQUE INDEX "razed_unlinked_wagers_razed_username_date_key" ON "razed_unlinked_wagers"("razed_username", "date");
