-- Tournament-scoped ban: blocks a user from entering THIS tournament again
-- without touching their site account (unlike the sitewide suspension in
-- AdminService).
CREATE TABLE "tournament_bans" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "banned_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_bans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_bans_tournament_id_user_id_key" ON "tournament_bans"("tournament_id", "user_id");

ALTER TABLE "tournament_bans" ADD CONSTRAINT "tournament_bans_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_bans" ADD CONSTRAINT "tournament_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tournament_bans" ADD CONSTRAINT "tournament_bans_banned_by_id_fkey" FOREIGN KEY ("banned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
