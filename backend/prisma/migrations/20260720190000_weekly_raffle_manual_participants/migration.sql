-- AlterTable
ALTER TABLE "weekly_raffles" ADD COLUMN     "manual_add_user_ids" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "manual_exclude_user_ids" JSONB NOT NULL DEFAULT '[]';
