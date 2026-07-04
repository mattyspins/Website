-- Allow viewer picker entries from chatters who haven't linked Kick or registered on
-- the site: entries are now keyed by the raw kick_username (always known from chat),
-- with user_id becoming an optional bonus link instead of a hard requirement.

-- Backfill kick_username from the linked user before dropping the NOT NULL requirement
-- on user_id (every existing entry today has a linked user, so this covers all rows).
ALTER TABLE "viewer_picker_entries" ADD COLUMN "kick_username" TEXT;
UPDATE "viewer_picker_entries" e
SET "kick_username" = COALESCE(u."kick_username", 'unknown')
FROM "users" u
WHERE e."user_id" = u."id";
UPDATE "viewer_picker_entries" SET "kick_username" = 'unknown' WHERE "kick_username" IS NULL;
ALTER TABLE "viewer_picker_entries" ALTER COLUMN "kick_username" SET NOT NULL;

-- user_id is now optional
ALTER TABLE "viewer_picker_entries" DROP CONSTRAINT "viewer_picker_entries_user_id_fkey";
ALTER TABLE "viewer_picker_entries" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "viewer_picker_entries" ADD CONSTRAINT "viewer_picker_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Re-key uniqueness off kick_username instead of user_id
DROP INDEX "viewer_picker_entries_picker_id_user_id_key";
CREATE UNIQUE INDEX "viewer_picker_entries_picker_id_kick_username_key" ON "viewer_picker_entries"("picker_id", "kick_username");

-- Winner is now tracked by which entry won (so an unlinked entrant can win too),
-- not by a direct user reference. Any existing winner_id values pointed at users,
-- not entries, so they're cleared rather than carried forward incorrectly.
UPDATE "viewer_pickers" SET "winner_id" = NULL;
ALTER TABLE "viewer_pickers" DROP CONSTRAINT "viewer_pickers_winner_id_fkey";
ALTER TABLE "viewer_pickers" RENAME COLUMN "winner_id" TO "winning_entry_id";
CREATE UNIQUE INDEX "viewer_pickers_winning_entry_id_key" ON "viewer_pickers"("winning_entry_id");
ALTER TABLE "viewer_pickers" ADD CONSTRAINT "viewer_pickers_winning_entry_id_fkey" FOREIGN KEY ("winning_entry_id") REFERENCES "viewer_picker_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
