import "server-only";

import prisma from "@/lib/prisma";

// Public, progress-free + auth-free view of training programs for the parent-facing
// "Giáo trình" pages. Exposes the curriculum blueprint (milestones, outcomes, skills,
// lesson titles) but never links to or includes actual lesson content/slides.

export interface PublicProgramCard {
  id: string;
  title: string;
  description: string | null;
  milestoneCount: number;
  lessonCount: number;
  skillCount: number;
  totalMinutes: number;
}

export interface PublicLesson {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
}

export interface PublicOutcome {
  id: string;
  title: string;
  description: string | null;
  skills: string[];
}

export interface PublicMilestone {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  lessons: PublicLesson[];
  outcomes: PublicOutcome[];
}

export interface PublicSkillNode {
  id: string;
  title: string;
  description: string | null;
  children: PublicSkillNode[];
}

export interface PublicProgramDetail {
  id: string;
  title: string;
  description: string | null;
  milestoneCount: number;
  lessonCount: number;
  skillCount: number;
  totalMinutes: number;
  milestones: PublicMilestone[];
  skills: PublicSkillNode[];
}

/** Active programs that have at least one published lesson, for the card grid. */
export async function getPublicPrograms(): Promise<PublicProgramCard[]> {
  const programs = await prisma.program.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      _count: { select: { skills: true } },
      milestones: {
        select: {
          lessons: {
            where: { lesson: { isPublished: true } },
            select: { lessonId: true, lesson: { select: { duration: true } } },
          },
        },
      },
    },
  });

  return programs
    .map((program) => {
      const lessonDurations = new Map<string, number>();
      for (const milestone of program.milestones) {
        for (const link of milestone.lessons) {
          lessonDurations.set(link.lessonId, link.lesson.duration);
        }
      }
      const totalMinutes = [...lessonDurations.values()].reduce((sum, value) => sum + value, 0);

      return {
        id: program.id,
        title: program.title,
        description: program.description,
        milestoneCount: program.milestones.length,
        lessonCount: lessonDurations.size,
        skillCount: program._count.skills,
        totalMinutes,
      };
    })
    // Show programs that have a roadmap to display (parents care about the milestones,
    // outcomes and skills even before lessons are assigned to each milestone).
    .filter((program) => program.milestoneCount > 0);
}

export async function getPublicProgramDetail(id: string): Promise<PublicProgramDetail | null> {
  const program = await prisma.program.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      milestones: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          color: true,
          lessons: {
            where: { lesson: { isPublished: true } },
            orderBy: { sortOrder: "asc" },
            select: {
              lesson: {
                select: { id: true, title: true, duration: true, difficulty: true },
              },
            },
          },
          outcomes: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              skills: { select: { skill: { select: { title: true } } } },
            },
          },
        },
      },
      skills: {
        orderBy: [{ parentSkillId: "asc" }, { sortOrder: "asc" }],
        select: { id: true, title: true, description: true, parentSkillId: true },
      },
    },
  });

  if (!program) return null;

  const milestones: PublicMilestone[] = program.milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    icon: milestone.icon,
    color: milestone.color,
    lessons: milestone.lessons.map((link) => ({
      id: link.lesson.id,
      title: link.lesson.title,
      duration: link.lesson.duration,
      difficulty: link.lesson.difficulty,
    })),
    outcomes: milestone.outcomes.map((outcome) => ({
      id: outcome.id,
      title: outcome.title,
      description: outcome.description,
      skills: outcome.skills.map((link) => link.skill.title),
    })),
  }));

  // Build the skill tree (root skills with their direct children).
  const childrenByParent = new Map<string, typeof program.skills>();
  for (const skill of program.skills) {
    if (!skill.parentSkillId) continue;
    const list = childrenByParent.get(skill.parentSkillId) ?? [];
    list.push(skill);
    childrenByParent.set(skill.parentSkillId, list);
  }
  const skills: PublicSkillNode[] = program.skills
    .filter((skill) => !skill.parentSkillId)
    .map((skill) => ({
      id: skill.id,
      title: skill.title,
      description: skill.description,
      children: (childrenByParent.get(skill.id) ?? []).map((child) => ({
        id: child.id,
        title: child.title,
        description: child.description,
        children: [],
      })),
    }));

  const uniqueLessonIds = new Set<string>();
  let totalMinutes = 0;
  for (const milestone of milestones) {
    for (const lesson of milestone.lessons) {
      if (!uniqueLessonIds.has(lesson.id)) {
        uniqueLessonIds.add(lesson.id);
        totalMinutes += lesson.duration;
      }
    }
  }

  return {
    id: program.id,
    title: program.title,
    description: program.description,
    milestoneCount: milestones.length,
    lessonCount: uniqueLessonIds.size,
    skillCount: program.skills.length,
    totalMinutes,
    milestones,
    skills,
  };
}
