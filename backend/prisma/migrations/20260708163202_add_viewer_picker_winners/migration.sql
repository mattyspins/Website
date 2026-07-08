-- CreateTable
CREATE TABLE "viewer_picker_winners" (
    "id" TEXT NOT NULL,
    "picker_id" TEXT NOT NULL,
    "kick_username" TEXT NOT NULL,
    "user_id" TEXT,
    "won_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewer_picker_winners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "viewer_picker_winners_picker_id_idx" ON "viewer_picker_winners"("picker_id");

-- AddForeignKey
ALTER TABLE "viewer_picker_winners" ADD CONSTRAINT "viewer_picker_winners_picker_id_fkey" FOREIGN KEY ("picker_id") REFERENCES "viewer_pickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_picker_winners" ADD CONSTRAINT "viewer_picker_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
