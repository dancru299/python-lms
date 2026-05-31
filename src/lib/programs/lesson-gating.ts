import "server-only";

import prisma from "@/lib/prisma";

// Sequential lesson gating for students enrolled in a program.
//
// A lesson unlocks only when the immediately-preceding lesson in the program order is
// "passed". Passing a lesson requires BOTH:
//   1. viewing every tab (UserProgress.completed === true — the time-based signal), and
//   2. submitting every homework exercise of that lesson.
// A teacher can override the gate for a single student via LessonUnlock.
//
// Lessons that aren't part of the student's program (e.g. free library browsing) are
// never gated. Teachers/admins are never gated — callers should skip this for them.

export interface LessonGateInfo {
  locked: boolean;
  /** The lesson the student must finish first, when locked. */
  requiredLessonId: string | null;
  requiredLessonTitle: string | null;
}

export interface ProgramGate {
  programId: string;
  orderedLessonIds: string[];
  gates: Map<string, LessonGateInfo>;
}

const UNLOCKED: LessonGateInfo = {
  locked: false,
  requiredLessonId: null,
  requiredLessonTitle: null,
};

/**
 * The program id of the student's most recent program-bearing classroom enrollment, or null
 * when they aren't in any classroom that has a program. Throws on DB error (callers decide
 * whether to fail open or closed) — distinct from {@link computeProgramGate}, which returns
 * null for both "no program" and "error".
 */
export async function getStudentProgramId(userId: string): Promise<string | null> {
  const enrollments = await prisma.classroomStudent.findMany({
    where: { studentId: userId },
    select: { classroom: { select: { programId: true } } },
    orderBy: { joinedAt: "desc" },
  });
  return enrollments.find((item) => item.classroom.programId)?.classroom.programId ?? null;
}

/**
 * Compute the lock state of every lesson in the student's active program, in order.
 * Returns null when the student isn't in a program (→ nothing is gated).
 *
 * Fails open: any unexpected error resolves to null so a gating problem can never make
 * the whole lesson/dashboard unreachable.
 */
export async function computeProgramGate(userId: string): Promise<ProgramGate | null> {
  try {
    const programId = await getStudentProgramId(userId);
    if (!programId) return null;

    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        milestones: {
          orderBy: { sortOrder: "asc" },
          select: {
            lessons: {
              where: { lesson: { isPublished: true } },
              orderBy: { sortOrder: "asc" },
              select: {
                lesson: {
                  select: {
                    id: true,
                    title: true,
                    exercises: { where: { type: "homework" }, select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!program) return null;

    // Flatten milestones → lessons into the program's linear order (unique, published).
    const ordered: { id: string; title: string; homeworkIds: string[] }[] = [];
    const seen = new Set<string>();
    for (const milestone of program.milestones) {
      for (const link of milestone.lessons) {
        const lesson = link.lesson;
        if (seen.has(lesson.id)) continue;
        seen.add(lesson.id);
        ordered.push({
          id: lesson.id,
          title: lesson.title,
          homeworkIds: lesson.exercises.map((exercise) => exercise.id),
        });
      }
    }

    const lessonIds = ordered.map((lesson) => lesson.id);
    const allHomeworkIds = ordered.flatMap((lesson) => lesson.homeworkIds);

    const [progressRows, submissionRows, unlockRows] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId, lessonId: { in: lessonIds }, completed: true },
        select: { lessonId: true },
      }),
      allHomeworkIds.length > 0
        ? prisma.submission.findMany({
            where: { userId, exerciseId: { in: allHomeworkIds } },
            select: { exerciseId: true },
          })
        : Promise.resolve([] as { exerciseId: string }[]),
      prisma.lessonUnlock.findMany({
        where: { studentId: userId, lessonId: { in: lessonIds } },
        select: { lessonId: true },
      }),
    ]);

    const tabsCompleted = new Set(progressRows.map((row) => row.lessonId));
    const submittedExercises = new Set(submissionRows.map((row) => row.exerciseId));
    const manuallyUnlocked = new Set(unlockRows.map((row) => row.lessonId));

    const isPassed = (lesson: { id: string; homeworkIds: string[] }): boolean => {
      const allHomeworkSubmitted = lesson.homeworkIds.every((id) => submittedExercises.has(id));
      return tabsCompleted.has(lesson.id) && allHomeworkSubmitted;
    };

    const gates = new Map<string, LessonGateInfo>();
    for (let i = 0; i < ordered.length; i++) {
      const lesson = ordered[i];
      if (i === 0 || manuallyUnlocked.has(lesson.id)) {
        gates.set(lesson.id, UNLOCKED);
        continue;
      }
      const prev = ordered[i - 1];
      gates.set(
        lesson.id,
        isPassed(prev)
          ? UNLOCKED
          : { locked: true, requiredLessonId: prev.id, requiredLessonTitle: prev.title }
      );
    }

    return { programId, orderedLessonIds: lessonIds, gates };
  } catch (error) {
    console.error("computeProgramGate failed; failing open (unlocked):", error);
    return null;
  }
}

/** Single-lesson gate for the lesson page and the submit API. */
export async function getLessonGateForStudent(
  userId: string,
  lessonId: string
): Promise<LessonGateInfo> {
  const gate = await computeProgramGate(userId);
  if (!gate) return UNLOCKED;
  return gate.gates.get(lessonId) ?? UNLOCKED;
}

export interface ClassroomGatingLesson {
  lessonId: string;
  title: string;
  locked: boolean;
  manuallyUnlocked: boolean;
}

export interface ClassroomGatingStudent {
  studentId: string;
  studentName: string;
  lessons: ClassroomGatingLesson[];
}

export interface ClassroomGatingOverview {
  hasProgram: boolean;
  students: ClassroomGatingStudent[];
}

/**
 * Per-student lock state for every lesson of a classroom's program, for the teacher's
 * manual-unlock UI. Computed program-scoped (this classroom's program) and with batched
 * queries — a fixed number of queries regardless of how many students are in the class.
 */
export async function getClassroomGatingOverview(classroomId: string): Promise<ClassroomGatingOverview> {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: {
      programId: true,
      students: {
        orderBy: { joinedAt: "asc" },
        select: { student: { select: { id: true, name: true } } },
      },
    },
  });
  if (!classroom?.programId) {
    return { hasProgram: false, students: [] };
  }

  const program = await prisma.program.findUnique({
    where: { id: classroom.programId },
    select: {
      milestones: {
        orderBy: { sortOrder: "asc" },
        select: {
          lessons: {
            where: { lesson: { isPublished: true } },
            orderBy: { sortOrder: "asc" },
            select: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  exercises: { where: { type: "homework" }, select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!program) return { hasProgram: false, students: [] };

  const ordered: { id: string; title: string; homeworkIds: string[] }[] = [];
  const seen = new Set<string>();
  for (const milestone of program.milestones) {
    for (const link of milestone.lessons) {
      if (seen.has(link.lesson.id)) continue;
      seen.add(link.lesson.id);
      ordered.push({
        id: link.lesson.id,
        title: link.lesson.title,
        homeworkIds: link.lesson.exercises.map((exercise) => exercise.id),
      });
    }
  }

  const studentIds = classroom.students.map((item) => item.student.id);
  const lessonIds = ordered.map((lesson) => lesson.id);
  const allHomeworkIds = ordered.flatMap((lesson) => lesson.homeworkIds);

  const [progressRows, submissionRows, unlockRows] = await Promise.all([
    prisma.userProgress.findMany({
      where: { userId: { in: studentIds }, lessonId: { in: lessonIds }, completed: true },
      select: { userId: true, lessonId: true },
    }),
    allHomeworkIds.length > 0
      ? prisma.submission.findMany({
          where: { userId: { in: studentIds }, exerciseId: { in: allHomeworkIds } },
          select: { userId: true, exerciseId: true },
        })
      : Promise.resolve([] as { userId: string; exerciseId: string }[]),
    prisma.lessonUnlock
      .findMany({
        where: { studentId: { in: studentIds }, lessonId: { in: lessonIds } },
        select: { studentId: true, lessonId: true },
      })
      // Tolerate the table not existing yet (migration not applied) — no overrides.
      .catch(() => [] as { studentId: string; lessonId: string }[]),
  ]);

  const tabsCompleted = new Set(progressRows.map((row) => `${row.userId}|${row.lessonId}`));
  const submitted = new Set(submissionRows.map((row) => `${row.userId}|${row.exerciseId}`));
  const manualUnlocks = new Set(unlockRows.map((row) => `${row.studentId}|${row.lessonId}`));

  const students: ClassroomGatingStudent[] = classroom.students.map(({ student }) => {
    const isPassed = (lesson: { id: string; homeworkIds: string[] }) =>
      tabsCompleted.has(`${student.id}|${lesson.id}`) &&
      lesson.homeworkIds.every((id) => submitted.has(`${student.id}|${id}`));

    const lessons = ordered.map((lesson, index) => {
      const manuallyUnlocked = manualUnlocks.has(`${student.id}|${lesson.id}`);
      const locked = index === 0 || manuallyUnlocked ? false : !isPassed(ordered[index - 1]);
      return { lessonId: lesson.id, title: lesson.title, locked, manuallyUnlocked };
    });

    return { studentId: student.id, studentName: student.name, lessons };
  });

  return { hasProgram: true, students };
}
