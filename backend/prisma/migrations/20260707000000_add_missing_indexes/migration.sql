-- Add indexes on columns that are filtered/ordered on frequently but were
-- never indexed: per-user point/purchase/notification history, and admin
-- audit-log lookups by admin or target.

-- CreateIndex
CREATE INDEX "point_transactions_user_id_created_at_idx" ON "point_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "store_purchases_user_id_status_idx" ON "store_purchases"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_created_at_idx" ON "audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs"("target_id");
