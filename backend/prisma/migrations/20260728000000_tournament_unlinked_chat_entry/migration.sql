-- Anyone typing the join keyword in Kick chat gets entered into the draw, even
-- if they've never verified a site account. user_id becomes optional and
-- kick_username becomes the identity for unlinked entrants — same nullable
-- userId?/kickUsername? split already used by BingoParticipant and
-- WagerRacePayout's unlinked-winner handling.

ALTER TABLE "tournament_entries" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "tournament_entries" ADD COLUMN "kick_username" TEXT;
-- Postgres treats NULLs as distinct in unique indexes, so these two constraints
-- coexist: linked entrants are deduped on user_id, unlinked on kick_username.
CREATE UNIQUE INDEX "tournament_entries_tournament_id_kick_username_key"
  ON "tournament_entries" ("tournament_id", "kick_username");

ALTER TABLE "tournament_participants" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "tournament_participants" ADD COLUMN "kick_username" TEXT;
CREATE UNIQUE INDEX "tournament_participants_tournament_id_kick_username_key"
  ON "tournament_participants" ("tournament_id", "kick_username");

ALTER TABLE "tournament_bans" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "tournament_bans" ADD COLUMN "kick_username" TEXT;
CREATE UNIQUE INDEX "tournament_bans_tournament_id_kick_username_key"
  ON "tournament_bans" ("tournament_id", "kick_username");
