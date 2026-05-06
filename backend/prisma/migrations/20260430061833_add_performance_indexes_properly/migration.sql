-- CreateIndex
CREATE INDEX "idx_leaderboard_wagers_leaderboard_user" ON "leaderboard_wagers"("leaderboard_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_leaderboards_status_dates" ON "leaderboards"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_users_kick_id" ON "users"("kick_id");

-- CreateIndex
CREATE INDEX "idx_users_kick_username" ON "users"("kick_username");
