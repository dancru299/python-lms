import "server-only";

import prisma from "@/lib/prisma";
import { generateAiJsonObject } from "@/lib/ai/lesson-generation";

export interface AutoArrangeOutcomeMap {
  outcomeId: string;
  lessonIds: string[];
}

export interface AutoArrangeMilestoneMap {
  milestoneId: string;
  lessonIds: string[];
  outcomes: AutoArrangeOutcomeMap[];
}

export interface AutoArrangeSuggestion {
  milestones: AutoArrangeMilestoneMap[];
  unassignedLessonIds: string[];
}

export interface AutoArrangeResult {
  suggestion: AutoArrangeSuggestion;
  meta: { provider: string; model: string };
}

function truncate(value: string | null | undefined, max = 220): string {
  if (!value) return "";
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function generateAutoArrangeSuggestion(programId: string): Promise<AutoArrangeResult> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
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
    },
  });

  if (!program) {
    throw new Error("Không tìm thấy chương trình");
  }

  if (program.milestones.length === 0) {
    throw new Error("Chương trình chưa có mốc (milestone) nào để sắp xếp bài học vào.");
  }

  const chapters = await prisma.chapter.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      title: true,
      lessons: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          objectiveKnowledge: true,
          objectiveSkills: true,
        },
      },
    },
  });

  const lessons = chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      chapter: chapter.title,
      goal: truncate(lesson.objectiveKnowledge || lesson.objectiveSkills, 180),
    }))
  );

  if (lessons.length === 0) {
    throw new Error("Chưa có bài học nào được công bố để sắp xếp. Hãy publish bài học trước.");
  }

  const milestonePayload = program.milestones.map((milestone) => ({
    milestoneId: milestone.id,
    title: milestone.title,
    description: truncate(milestone.description, 180),
    outcomes: milestone.outcomes.map((outcome) => ({
      outcomeId: outcome.id,
      title: outcome.title,
      skills: outcome.skills.map((link) => link.skill.title),
    })),
  }));

  const systemPrompt = [
    "You are an expert Python curriculum designer.",
    "Your job: map a fixed set of EXISTING published lessons onto the program's milestones and their learning outcomes.",
    "Return ONLY one valid JSON object — no markdown fences, no commentary.",
    "Use ONLY the ids provided in the input. Never invent ids or lessons.",
  ].join("\n");

  const userPrompt = [
    "PROGRAM:",
    JSON.stringify({ title: program.title, description: truncate(program.description, 200) }),
    "",
    "MILESTONES (with their learning outcomes and the skills each outcome develops):",
    JSON.stringify(milestonePayload),
    "",
    "AVAILABLE LESSONS (the only lessons you may use):",
    JSON.stringify(lessons),
    "",
    "Return JSON with EXACTLY this shape:",
    `{
  "milestones": [
    {
      "milestoneId": "<one of the milestone ids>",
      "lessonIds": ["<lesson id>", "..."],
      "outcomes": [
        { "outcomeId": "<an outcome id of THIS milestone>", "lessonIds": ["<lesson id>", "..."] }
      ]
    }
  ]
}`,
    "",
    "Rules:",
    "- Assign each lesson to AT MOST ONE milestone — the single most relevant one. Do not repeat a lesson across milestones.",
    "- Order lessonIds inside each milestone pedagogically (fundamentals first, harder topics later).",
    "- Within a milestone, attach each lesson to the outcome(s) it supports. An outcome's lessonIds MUST be a subset of that milestone's lessonIds. A lesson may support multiple outcomes.",
    "- Include every milestone id, even if you assign it no lessons (use an empty lessonIds array).",
    "- It is OK to leave a lesson unassigned if it truly does not fit any milestone.",
  ].join("\n");

  const { json, meta } = await generateAiJsonObject({ systemPrompt, userPrompt });

  return {
    suggestion: validateSuggestion(json, program.milestones, lessons.map((lesson) => lesson.id)),
    meta,
  };
}

function validateSuggestion(
  raw: unknown,
  milestones: Array<{ id: string; outcomes: Array<{ id: string }> }>,
  publishedLessonIds: string[]
): AutoArrangeSuggestion {
  const lessonIdSet = new Set(publishedLessonIds);
  const outcomeIdsByMilestone = new Map(
    milestones.map((milestone) => [milestone.id, new Set(milestone.outcomes.map((outcome) => outcome.id))])
  );

  const rawMilestones =
    raw && typeof raw === "object" && Array.isArray((raw as { milestones?: unknown }).milestones)
      ? ((raw as { milestones: unknown[] }).milestones as Array<Record<string, unknown>>)
      : [];

  const rawByMilestoneId = new Map<string, Record<string, unknown>>();
  for (const entry of rawMilestones) {
    const milestoneId = typeof entry.milestoneId === "string" ? entry.milestoneId : "";
    if (milestoneId) rawByMilestoneId.set(milestoneId, entry);
  }

  const assignedLessonIds = new Set<string>();
  const milestoneMaps: AutoArrangeMilestoneMap[] = [];

  for (const milestone of milestones) {
    const entry = rawByMilestoneId.get(milestone.id);
    const validOutcomeIds = outcomeIdsByMilestone.get(milestone.id) ?? new Set<string>();

    // Lessons for this milestone: valid, published, not already assigned elsewhere.
    const lessonIds: string[] = [];
    for (const lessonId of asStringArray(entry?.lessonIds)) {
      if (lessonIdSet.has(lessonId) && !assignedLessonIds.has(lessonId)) {
        assignedLessonIds.add(lessonId);
        lessonIds.push(lessonId);
      }
    }

    const milestoneLessonSet = new Set(lessonIds);

    const rawOutcomes = Array.isArray(entry?.outcomes)
      ? (entry?.outcomes as Array<Record<string, unknown>>)
      : [];

    const outcomes: AutoArrangeOutcomeMap[] = [];
    for (const outcome of milestone.outcomes) {
      const rawOutcome = rawOutcomes.find(
        (item) => typeof item.outcomeId === "string" && item.outcomeId === outcome.id
      );
      const outcomeLessonIds = asStringArray(rawOutcome?.lessonIds).filter(
        (lessonId) => milestoneLessonSet.has(lessonId)
      );
      outcomes.push({ outcomeId: outcome.id, lessonIds: Array.from(new Set(outcomeLessonIds)) });
    }

    // Guard against AI returning outcome ids from another milestone (ignored above by iterating real outcomes).
    void validOutcomeIds;

    milestoneMaps.push({ milestoneId: milestone.id, lessonIds, outcomes });
  }

  const unassignedLessonIds = publishedLessonIds.filter((lessonId) => !assignedLessonIds.has(lessonId));

  return { milestones: milestoneMaps, unassignedLessonIds };
}
