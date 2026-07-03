-- CreateTable
CREATE TABLE "hunts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "start_cost" DECIMAL(12,2) NOT NULL,
    "bonuses" JSONB NOT NULL DEFAULT '[]',
    "is_started" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "gtb_game_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hunts_pkey" PRIMARY KEY ("id")
);
