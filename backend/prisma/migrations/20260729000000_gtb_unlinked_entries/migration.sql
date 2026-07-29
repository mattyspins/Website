-- Anyone typing "!guess <amount>" in Kick chat gets counted, even without a
-- verified site account. user_id becomes optional and kick_username becomes
-- the identity for unlinked entrants — same pattern already used by
-- BingoParticipant and the other unlinked-entry migrations.

ALTER TABLE "guess_submissions" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "guess_submissions" ADD COLUMN "kick_username" TEXT;
CREATE UNIQUE INDEX "guess_submissions_game_id_kick_username_key"
  ON "guess_submissions" ("game_id", "kick_username");

-- Set instead of winner_id when the closest guess came from an unlinked
-- entrant — there's no user row for winner_id to point at, so the automated
-- coin reward is skipped (an admin can still pay out manually via !addcoins),
-- but the win itself is still recorded and displayed.
ALTER TABLE "guess_the_balance" ADD COLUMN "winner_kick_username" TEXT;
