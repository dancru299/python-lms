-- CreateTable
CREATE TABLE "ClassroomAssignmentTarget" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAssignmentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomAssignmentTarget_assignmentId_idx" ON "ClassroomAssignmentTarget"("assignmentId");

-- CreateIndex
CREATE INDEX "ClassroomAssignmentTarget_studentId_idx" ON "ClassroomAssignmentTarget"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomAssignmentTarget_assignmentId_studentId_key" ON "ClassroomAssignmentTarget"("assignmentId", "studentId");

-- AddForeignKey
ALTER TABLE "ClassroomAssignmentTarget" ADD CONSTRAINT "ClassroomAssignmentTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignmentTarget" ADD CONSTRAINT "ClassroomAssignmentTarget_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
