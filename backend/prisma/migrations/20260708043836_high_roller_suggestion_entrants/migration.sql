-- CreateTable
CREATE TABLE "high_roller_suggestion_entrants" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "high_roller_suggestion_entrants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "high_roller_suggestion_entrants_session_id_kick_username_key" ON "high_roller_suggestion_entrants"("session_id", "kick_username");

-- AddForeignKey
ALTER TABLE "high_roller_suggestion_entrants" ADD CONSTRAINT "high_roller_suggestion_entrants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "high_roller_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
