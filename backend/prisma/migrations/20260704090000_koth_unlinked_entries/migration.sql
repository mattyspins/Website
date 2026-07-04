-- Allow King of the Hill entries from chatters who haven't linked Kick or registered on
-- the site: entries are now keyed by the raw kick_username (always known from chat),
-- with user_id becoming an optional bonus link instead of a hard requirement.

-- Backfill kick_username from the linked user before dropping the NOT NULL requirement
-- on user_id (every existing entry today has a linked user, so this covers all rows).
ALTER TABLE "king_of_the_hill_entries" ADD COLUMN "kick_username" TEXT;
UPDATE "king_of_the_hill_entries" e
SET "kick_username" = COALESCE(u."kick_username", 'unknown')
FROM "users" u
WHERE e."user_id" = u."id";
UPDATE "king_of_the_hill_entries" SET "kick_username" = 'unknown' WHERE "kick_username" IS NULL;
ALTER TABLE "king_of_the_hill_entries" ALTER COLUMN "kick_username" SET NOT NULL;

-- user_id is now optional on entries
ALTER TABLE "king_of_the_hill_entries" DROP CONSTRAINT "king_of_the_hill_entries_user_id_fkey";
ALTER TABLE "king_of_the_hill_entries" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "king_of_the_hill_entries" ADD CONSTRAINT "king_of_the_hill_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Re-key uniqueness off kick_username instead of user_id
DROP INDEX "king_of_the_hill_entries_session_id_user_id_key";
CREATE UNIQUE INDEX "king_of_the_hill_entries_session_id_kick_username_key" ON "king_of_the_hill_entries"("session_id", "kick_username");

-- user_id is now optional on rounds too, for rounds played by an unlinked entrant
ALTER TABLE "king_of_the_hill_rounds" DROP CONSTRAINT "king_of_the_hill_rounds_user_id_fkey";
ALTER TABLE "king_of_the_hill_rounds" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "king_of_the_hill_rounds" ADD CONSTRAINT "king_of_the_hill_rounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
