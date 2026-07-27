-- Tournament lifecycle now has 6 stages matching the admin UI's stepper
-- (Draft / Registration Open / Locked / Draw Complete / Live / Complete).
-- SLOT_SELECTION is renamed rather than dropped-and-recreated: a tournament
-- sitting in that state was, and still is, "drawn but not yet live" — the
-- meaning is preserved for any existing rows.
ALTER TYPE "TournamentStatus" RENAME VALUE 'SLOT_SELECTION' TO 'DRAWN';
ALTER TYPE "TournamentStatus" ADD VALUE 'LOCKED' AFTER 'REGISTRATION';

-- Lets an admin pause a live match (e.g. to sort out a dispute) without it
-- looking like an untouched PENDING match or a finished COMPLETED one.
ALTER TYPE "MatchStatus" ADD VALUE 'PAUSED';
