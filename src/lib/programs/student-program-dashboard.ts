import prisma from "@/lib/prisma";

export type SkillStatus = "not-started" | "learning" | "achieved";

export interface StudentDashboardLesson {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  chapterTitle: string;
  completed: boolean;
}

export interface StudentDashboardOutcome {
  id: string;
  title: string;
  description: string | null;
  percent: number;
  completed: boolean;
  totalLessons: number;
  completedLessons: number;
}

export interface StudentDashboardMilestone {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  percent: number;
  totalLessons: number;
  completedLessons: number;
  lessons: StudentDashboardLesson[];
  outcomes: StudentDashboardOutcome[];
}

export interface StudentDashboardSkill {
  id: string;
  title: string;
  description: string | null;
  parentSkillId: string | null;
  percent: number;
  status: SkillStatus;
}

export interface StudentDashboardPortfolioItem {
  id: string;
  title: string;
  source: "lesson" | "classroom";
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  gradedAt: string | null;
  link: string;
}

export interface StudentProgramDashboard {
  program: {
    id: string;
    title: string;
    description: string | null;
  };
  percent: number;
  totalLessons: number;
  completedLessons: number;
  nextLesson: StudentDashboardLesson | null;
  milestones: StudentDashboardMilestone[];
  skills: StudentDashboardSkill[];
  portfolio: StudentDashboardPortfolioItem[];
}

function percent(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function skillStatus(value: number): SkillStatus {
  if (value >= 100) return "achieved";
  if (value > 0) return "learning";
  return "not-started";
}

export async function getStudentProgramDashboard(userId: string): Promise<StudentProgramDashboard | null> {
  const program = await prisma.program.findFirst({
    where: { isActive: true },
    include: {
      milestones: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { lesson: { isPublished: true } },
            orderBy: { sortOrder: "asc" },
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  duration: true,
                  difficulty: true,
                  chapter: { select: { title: true } },
                },
              },
            },
          },
          outcomes: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                where: { lesson: { isPublished: true } },
                select: { lessonId: true },
              },
              skills: { select: { skillId: true } },
            },
          },
        },
      },
      skills: {
        orderBy: [{ parentSkillId: "asc" }, { sortOrder: "asc" }],
        include: {
          outcomeLinks: {
            include: {
              outcome: {
                include: {
                  lessons: {
                    where: { lesson: { isPublished: true } },
                    select: { lessonId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program) {
    return null;
  }

  const visibleProgramMilestones = program.milestones.filter(
    (milestone) => milestone.lessons.length > 0
  );
  const programLessonIds = Array.from(
    new Set(visibleProgramMilestones.flatMap((milestone) => milestone.lessons.map((link) => link.lessonId)))
  );

  const [progressRows, regularSubmissions, classroomSubmissions] = await Promise.all([
    prisma.userProgress.findMany({
      where: { userId, lessonId: { in: programLessonIds } },
      select: { lessonId: true, completed: true },
    }),
    prisma.submission.findMany({
      where: {
        userId,
        status: "graded",
        score: { not: null },
      },
      include: {
        exercise: {
          include: {
            lesson: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: [{ gradedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    prisma.classroomAssignmentSubmission.findMany({
      where: {
        studentId: userId,
        status: "graded",
        score: { not: null },
      },
      include: {
        assignment: {
          include: {
            classroom: { select: { id: true, name: true } },
            lesson: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: [{ gradedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
  ]);

  const completedLessonIds = new Set(
    progressRows.filter((progress) => progress.completed).map((progress) => progress.lessonId)
  );

  const outcomePercentById = new Map<string, number>();

  const milestones: StudentDashboardMilestone[] = visibleProgramMilestones.map((milestone) => {
    const lessons = milestone.lessons.map((link) => ({
      id: link.lesson.id,
      title: link.lesson.title,
      duration: link.lesson.duration,
      difficulty: link.lesson.difficulty,
      chapterTitle: link.lesson.chapter.title,
      completed: completedLessonIds.has(link.lessonId),
    }));

    const completedLessons = lessons.filter((lesson) => lesson.completed).length;

    const outcomes = milestone.outcomes.map((outcome) => {
      const lessonIds = outcome.lessons.map((link) => link.lessonId);
      const totalOutcomeLessons = lessonIds.length;
      const completedOutcomeLessons = lessonIds.filter((lessonId) => completedLessonIds.has(lessonId)).length;
      const outcomePercent = percent(completedOutcomeLessons, totalOutcomeLessons);
      outcomePercentById.set(outcome.id, outcomePercent);

      return {
        id: outcome.id,
        title: outcome.title,
        description: outcome.description,
        percent: outcomePercent,
        completed: totalOutcomeLessons > 0 && completedOutcomeLessons === totalOutcomeLessons,
        totalLessons: totalOutcomeLessons,
        completedLessons: completedOutcomeLessons,
      };
    });

    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      icon: milestone.icon,
      color: milestone.color,
      percent: percent(completedLessons, lessons.length),
      totalLessons: lessons.length,
      completedLessons,
      lessons,
      outcomes,
    };
  });

  const skillChildren = new Map<string | null, string[]>();
  for (const skill of program.skills) {
    const key = skill.parentSkillId ?? null;
    skillChildren.set(key, [...(skillChildren.get(key) ?? []), skill.id]);
  }

  const skillPercentCache = new Map<string, number>();

  function computeSkillPercent(skillId: string): number {
    if (skillPercentCache.has(skillId)) return skillPercentCache.get(skillId) ?? 0;

    const skill = program.skills.find((item) => item.id === skillId);
    if (!skill) return 0;

    const childPercents = (skillChildren.get(skillId) ?? []).map(computeSkillPercent);
    const directPercents = skill.outcomeLinks.map((link) => outcomePercentById.get(link.outcomeId) ?? 0);
    const value = childPercents.length > 0 ? average(childPercents) : average(directPercents);

    skillPercentCache.set(skillId, value);
    return value;
  }

  const skills = program.skills.map((skill) => {
    const value = computeSkillPercent(skill.id);
    return {
      id: skill.id,
      title: skill.title,
      description: skill.description,
      parentSkillId: skill.parentSkillId,
      percent: value,
      status: skillStatus(value),
    };
  });

  const orderedLessons = milestones.flatMap((milestone) => milestone.lessons);
  const nextLesson = orderedLessons.find((lesson) => !lesson.completed) ?? null;
  const completedLessons = orderedLessons.filter((lesson) => lesson.completed).length;

  const portfolio = [
    ...regularSubmissions.map((submission) => ({
      id: submission.id,
      title: submission.exercise.lesson.title,
      source: "lesson" as const,
      score: submission.score,
      maxScore: submission.maxScore,
      feedback: submission.feedback,
      gradedAt: submission.gradedAt?.toISOString() ?? null,
      link: `/lessons/${submission.exercise.lesson.id}`,
    })),
    ...classroomSubmissions.map((submission) => ({
      id: submission.id,
      title: submission.assignment.title || submission.assignment.lesson?.title || "Bài đã chấm",
      source: "classroom" as const,
      score: submission.score,
      maxScore: submission.assignment.maxScore,
      feedback: submission.feedback,
      gradedAt: submission.gradedAt?.toISOString() ?? null,
      link: `/classrooms/${submission.assignment.classroomId}/assignments/${submission.assignmentId}`,
    })),
  ]
    .sort((a, b) => {
      const dateA = a.gradedAt ? new Date(a.gradedAt).getTime() : 0;
      const dateB = b.gradedAt ? new Date(b.gradedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 8);

  return {
    program: {
      id: program.id,
      title: program.title,
      description: program.description,
    },
    percent: percent(completedLessons, orderedLessons.length),
    totalLessons: orderedLessons.length,
    completedLessons,
    nextLesson,
    milestones,
    skills,
    portfolio,
  };
}
