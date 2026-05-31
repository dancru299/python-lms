-- CreateTable
CREATE TABLE "LessonUnlock" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonUnlock_studentId_idx" ON "LessonUnlock"("studentId");

-- CreateIndex
CREATE INDEX "LessonUnlock_lessonId_idx" ON "LessonUnlock"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonUnlock_studentId_lessonId_key" ON "LessonUnlock"("studentId", "lessonId");

-- AddForeignKey
ALTER TABLE "LessonUnlock" ADD CONSTRAINT "LessonUnlock_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonUnlock" ADD CONSTRAINT "LessonUnlock_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
