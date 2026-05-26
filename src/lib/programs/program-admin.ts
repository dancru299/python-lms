import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const programDetailInclude = {
  milestones: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              duration: true,
              difficulty: true,
              isPublished: true,
              chapterId: true,
              chapter: { select: { title: true, color: true, icon: true } },
            },
          },
        },
      },
      outcomes: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          lessons: {
            include: {
              lesson: { select: { id: true, title: true, chapterId: true, isPublished: true } },
            },
          },
          skills: {
            include: {
              skill: { select: { id: true, title: true, parentSkillId: true } },
            },
          },
        },
      },
    },
  },
  skills: {
    orderBy: [{ parentSkillId: "asc" as const }, { sortOrder: "asc" as const }],
    include: {
      parentSkill: { select: { id: true, title: true } },
      outcomeLinks: {
        include: {
          outcome: { select: { id: true, title: true, milestoneId: true } },
        },
      },
    },
  },
} satisfies Prisma.ProgramInclude;

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asNullableString(value: unknown): string | null {
  const text = asString(value);
  return text || null;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asSortOrder(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

export async function getProgramDetail(id: string) {
  return prisma.program.findUnique({
    where: { id },
    include: programDetailInclude,
  });
}

export async function getAllLessonsForProgramAdmin() {
  return prisma.chapter.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      color: true,
      icon: true,
      lessons: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          duration: true,
          difficulty: true,
          isPublished: true,
          objectiveKnowledge: true,
          objectiveSkills: true,
          objectiveAttitude: true,
        },
      },
    },
  });
}

export async function assertProgramOwnsMilestone(programId: string, milestoneId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, programId },
    select: { id: true },
  });
}

export async function assertProgramOwnsOutcome(programId: string, outcomeId: string) {
  return prisma.learningOutcome.findFirst({
    where: { id: outcomeId, milestone: { programId } },
    select: { id: true, milestoneId: true },
  });
}

export async function assertProgramOwnsSkill(programId: string, skillId: string) {
  return prisma.skill.findFirst({
    where: { id: skillId, programId },
    select: { id: true, parentSkillId: true },
  });
}
