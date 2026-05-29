-- Add VIP and Depositor role flags to users
ALTER TABLE "users" ADD COLUMN "is_vip" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "is_depositor" BOOLEAN NOT NULL DEFAULT false;
