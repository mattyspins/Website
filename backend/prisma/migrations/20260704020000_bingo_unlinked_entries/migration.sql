-- Let Bonus Bingo be played by any Kick chatter, whether or not they've linked Kick or
-- registered on the site. Participants keep a raw kick_username captured from chat (when
-- joining that way), with user_id becoming an optional bonus link instead of a hard
-- requirement. The "whose turn is it" and "who claimed this cell" pointers get a parallel
-- raw-username column too, since either can now point at an unlinked participant.

-- BonusBingo: track the current turn's raw identity alongside the optional user link
ALTER TABLE "bonus_bingo" ADD COLUMN "current_kick_username" TEXT;
UPDATE "bonus_bingo" b
SET "current_kick_username" = u."kick_username"
FROM "users" u
WHERE b."current_user_id" = u."id";

-- BingoCell: same for whoever claimed a cell
ALTER TABLE "bingo_cells" ADD COLUMN "claimed_by_kick_username" TEXT;
UPDATE "bingo_cells" c
SET "claimed_by_kick_username" = u."kick_username"
FROM "users" u
WHERE c."claimed_by_id" = u."id";

-- BingoParticipant: user_id becomes optional, kick_username is the new raw identity
ALTER TABLE "bingo_participants" ADD COLUMN "kick_username" TEXT;
UPDATE "bingo_participants" p
SET "kick_username" = u."kick_username"
FROM "users" u
WHERE p."user_id" = u."id";

ALTER TABLE "bingo_participants" DROP CONSTRAINT "bingo_participants_user_id_fkey";
ALTER TABLE "bingo_participants" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "bingo_participants" ADD CONSTRAINT "bingo_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A chat-joined participant is deduped on kick_username; multiple NULLs are allowed by
-- Postgres (website joiners with no Kick linked), so this coexists with the existing
-- (game_id, user_id) unique index without conflict.
CREATE UNIQUE INDEX "bingo_participants_game_id_kick_username_key" ON "bingo_participants"("game_id", "kick_username");
