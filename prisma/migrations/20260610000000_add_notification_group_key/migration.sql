-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "groupKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_groupKey_key" ON "Notification"("userId", "groupKey");
