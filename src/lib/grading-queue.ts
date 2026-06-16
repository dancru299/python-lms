import prisma from "@/lib/prisma";

/**
 * One row in the teacher grading queue: all of a single student's pending
 * homework for a single lesson collapsed together, so a 3-exercise homework
 * shows up as ONE "2/3 bài cần chấm" entry instead of three separate cards.
 */
export interface GradingQueueGroup {
  /** Stable key: `${studentId}:${lessonId}` */
  key: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  lessonId: string;
  lessonTitle: string;
  chapterTitle: string;
  /** How many submissions in this lesson are still waiting to be graded. */
  pendingCount: number;
  /** Total number of exercises that exist in the lesson. */
  totalExercises: number;
  /** Highest maxScore among the pending submissions (for the queue badge). */
  maxScore: number;
  /** The submission a teacher lands on first when opening this group. */
  firstPendingSubmissionId: string;
  /** Oldest pending submission time — used to prioritise the queue. */
  earliestSubmittedAt: Date;
}

/**
 * Build the grouped grading queue from every pending submission. Groups are
 * keyed by student+lesson and sorted oldest-first so the longest-waiting
 * homework rises to the top.
 */
export async function getPendingGradingGroups(
  limit?: number,
): Promise<GradingQueueGroup[]> {
  const pending = await prisma.submission.findMany({
    where: { status: "pending" },
    include: {
      exercise: {
        include: { lesson: { include: { chapter: true } } },
      },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) return [];

  // Count how many exercises each involved lesson has so the queue can show
  // "pending / total" (e.g. 2/3) for each student.
  const lessonIds = [...new Set(pending.map((s) => s.exercise.lessonId))];
  const exerciseCounts = await prisma.exercise.groupBy({
    by: ["lessonId"],
    where: { lessonId: { in: lessonIds } },
    _count: { _all: true },
  });
  const totalByLesson = new Map(
    exerciseCounts.map((c) => [c.lessonId, c._count._all]),
  );

  const groups = new Map<string, GradingQueueGroup>();
  for (const submission of pending) {
    const lessonId = submission.exercise.lessonId;
    const studentId = submission.userId;
    const key = `${studentId}:${lessonId}`;

    const existing = groups.get(key);
    if (existing) {
      existing.pendingCount += 1;
      existing.maxScore = Math.max(existing.maxScore, submission.maxScore);
      continue;
    }

    // `pending` is sorted ascending, so the first one we see for a group is
    // both the oldest and the submission the teacher should open first.
    groups.set(key, {
      key,
      studentId,
      studentName: submission.user.name,
      studentEmail: submission.user.email,
      lessonId,
      lessonTitle: submission.exercise.lesson.title,
      chapterTitle: submission.exercise.lesson.chapter.title,
      pendingCount: 1,
      totalExercises: totalByLesson.get(lessonId) ?? 1,
      maxScore: submission.maxScore,
      firstPendingSubmissionId: submission.id,
      earliestSubmittedAt: submission.createdAt,
    });
  }

  const ordered = [...groups.values()].sort(
    (a, b) => a.earliestSubmittedAt.getTime() - b.earliestSubmittedAt.getTime(),
  );

  return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
}
