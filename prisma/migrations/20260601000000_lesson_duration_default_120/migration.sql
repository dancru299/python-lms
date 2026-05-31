-- Each session is 2 hours: default lesson duration is 120 minutes.
ALTER TABLE "Lesson" ALTER COLUMN "duration" SET DEFAULT 120;
