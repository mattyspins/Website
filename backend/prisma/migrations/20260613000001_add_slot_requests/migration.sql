-- CreateEnum
CREATE TYPE "SlotRequestStatus" AS ENUM ('PENDING', 'ADDED', 'REJECTED');

-- CreateTable
CREATE TABLE "slot_requests" (
    "id" TEXT NOT NULL,
    "slot_name" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "SlotRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_slot_requests_status" ON "slot_requests"("status");

-- AddForeignKey
ALTER TABLE "slot_requests" ADD CONSTRAINT "slot_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
