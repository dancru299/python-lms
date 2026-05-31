import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import { getProgramDetail } from "@/lib/programs/program-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface IncomingOutcome {
  outcomeId?: unknown;
  lessonIds?: unknown;
}

interface IncomingMilestone {
  milestoneId?: unknown;
  lessonIds?: unknown;
  outcomes?: unknown;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId } = await params;
    const body = await request.json();
    const incomingMilestones: IncomingMilestone[] = Array.isArray(body?.milestones) ? body.milestones : [];

    if (incomingMilestones.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu để áp dụng" }, { status: 400 });
    }

    const milestones = await prisma.milestone.findMany({
      where: { programId },
      select: { id: true, outcomes: { select: { id: true } } },
    });

    if (milestones.length === 0) {
      return NextResponse.json({ error: "Chương trình chưa có mốc nào" }, { status: 400 });
    }

    const outcomeIdsByMilestone = new Map(
      milestones.map((milestone) => [milestone.id, new Set(milestone.outcomes.map((outcome) => outcome.id))])
    );

    // Collect every lesson id referenced, then keep only published ones that exist.
    const referencedLessonIds = new Set<string>();
    for (const milestone of incomingMilestones) {
      for (const lessonId of asStringArray(milestone.lessonIds)) referencedLessonIds.add(lessonId);
      if (Array.isArray(milestone.outcomes)) {
        for (const outcome of milestone.outcomes as IncomingOutcome[]) {
          for (const lessonId of asStringArray(outcome.lessonIds)) referencedLessonIds.add(lessonId);
        }
      }
    }

    const publishedLessons = await prisma.lesson.findMany({
      where: { id: { in: Array.from(referencedLessonIds) }, isPublished: true },
      select: { id: true },
    });
    const publishedLessonIds = new Set(publishedLessons.map((lesson) => lesson.id));

    await prisma.$transaction(async (tx) => {
      for (const incoming of incomingMilestones) {
        const milestoneId = typeof incoming.milestoneId === "string" ? incoming.milestoneId : "";
        const validOutcomeIds = outcomeIdsByMilestone.get(milestoneId);
        if (!milestoneId || !validOutcomeIds) continue;

        const milestoneLessonIds = asStringArray(incoming.lessonIds)
          .filter((lessonId) => publishedLessonIds.has(lessonId))
          .filter((lessonId, index, arr) => arr.indexOf(lessonId) === index);
        const milestoneLessonSet = new Set(milestoneLessonIds);

        // Rebuild this milestone's lesson links from the confirmed list.
        await tx.milestoneLesson.deleteMany({ where: { milestoneId } });
        if (milestoneLessonIds.length > 0) {
          await tx.milestoneLesson.createMany({
            data: milestoneLessonIds.map((lessonId, index) => ({ milestoneId, lessonId, sortOrder: index })),
            skipDuplicates: true,
          });
        }

        const incomingOutcomes = Array.isArray(incoming.outcomes)
          ? (incoming.outcomes as IncomingOutcome[])
          : [];

        for (const outcomeId of validOutcomeIds) {
          const incomingOutcome = incomingOutcomes.find(
            (item) => typeof item.outcomeId === "string" && item.outcomeId === outcomeId
          );
          const outcomeLessonIds = asStringArray(incomingOutcome?.lessonIds)
            .filter((lessonId) => milestoneLessonSet.has(lessonId))
            .filter((lessonId, index, arr) => arr.indexOf(lessonId) === index);

          await tx.outcomeLesson.deleteMany({ where: { outcomeId } });
          if (outcomeLessonIds.length > 0) {
            await tx.outcomeLesson.createMany({
              data: outcomeLessonIds.map((lessonId) => ({ outcomeId, lessonId })),
              skipDuplicates: true,
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, program: await getProgramDetail(programId) });
  } catch (error) {
    console.error("Auto-arrange apply error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi khi áp dụng gợi ý" }, { status: 500 });
  }
}
