-- CreateTable
CREATE TABLE "hunt_tracker_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hunt_tracker_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "hunt_tracker_sessions" ADD CONSTRAINT "hunt_tracker_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
