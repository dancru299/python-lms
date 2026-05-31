-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "programId" TEXT;

-- CreateIndex
CREATE INDEX "Classroom_programId_idx" ON "Classroom"("programId");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
