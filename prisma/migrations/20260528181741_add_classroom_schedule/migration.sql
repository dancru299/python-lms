-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';

-- AlterTable
ALTER TABLE "ClassroomAssignment" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "ClassroomAssignmentSubmission" ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClassroomScheduleRule" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomSession" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "title" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomScheduleRule_classroomId_idx" ON "ClassroomScheduleRule"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomScheduleRule_classroomId_weekday_startTime_key" ON "ClassroomScheduleRule"("classroomId", "weekday", "startTime");

-- CreateIndex
CREATE INDEX "ClassroomSession_classroomId_startsAt_idx" ON "ClassroomSession"("classroomId", "startsAt");

-- CreateIndex
CREATE INDEX "ClassroomAssignment_sessionId_idx" ON "ClassroomAssignment"("sessionId");

-- AddForeignKey
ALTER TABLE "ClassroomScheduleRule" ADD CONSTRAINT "ClassroomScheduleRule_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSession" ADD CONSTRAINT "ClassroomSession_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
