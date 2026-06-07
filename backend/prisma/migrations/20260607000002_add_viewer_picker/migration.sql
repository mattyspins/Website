-- CreateEnum
CREATE TYPE "ViewerPickerStatus" AS ENUM ('OPEN', 'CLOSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "viewer_pickers" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "label" TEXT,
    "status" "ViewerPickerStatus" NOT NULL DEFAULT 'OPEN',
    "winner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "viewer_pickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_picker_entries" (
    "id" TEXT NOT NULL,
    "picker_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewer_picker_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "viewer_picker_entries_picker_id_user_id_key" ON "viewer_picker_entries"("picker_id", "user_id");

-- AddForeignKey
ALTER TABLE "viewer_pickers" ADD CONSTRAINT "viewer_pickers_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_picker_entries" ADD CONSTRAINT "viewer_picker_entries_picker_id_fkey" FOREIGN KEY ("picker_id") REFERENCES "viewer_pickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_picker_entries" ADD CONSTRAINT "viewer_picker_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
