-- Add block-compatible lesson sections without changing the existing HTML snapshot.
ALTER TABLE "Section"
ADD COLUMN "contentFormat" TEXT NOT NULL DEFAULT 'html',
ADD COLUMN "contentBlocks" JSONB;

-- Store lesson media metadata separately from section HTML.
CREATE TABLE "LessonMedia" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT,
  "draftId" TEXT,
  "storageKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "caption" TEXT,
  "altText" TEXT,
  "annotations" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LessonMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonMedia_storageKey_key" ON "LessonMedia"("storageKey");
CREATE INDEX "LessonMedia_lessonId_idx" ON "LessonMedia"("lessonId");
CREATE INDEX "LessonMedia_draftId_idx" ON "LessonMedia"("draftId");
CREATE INDEX "LessonMedia_createdById_idx" ON "LessonMedia"("createdById");

ALTER TABLE "LessonMedia"
ADD CONSTRAINT "LessonMedia_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LessonMedia"
ADD CONSTRAINT "LessonMedia_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
