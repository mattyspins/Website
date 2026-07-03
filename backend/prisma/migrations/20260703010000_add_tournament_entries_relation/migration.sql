-- Clean up orphaned tournament_entries rows (from tournaments/users that no
-- longer exist) before adding FK constraints — this relation was never
-- enforced at the DB level before, so dangling rows can exist.
DELETE FROM "tournament_entries" WHERE "tournament_id" NOT IN (SELECT "id" FROM "tournaments");
DELETE FROM "tournament_entries" WHERE "user_id" NOT IN (SELECT "id" FROM "users");

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

