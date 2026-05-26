import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import { getProgramDetail } from "@/lib/programs/program-admin";
import {
  normalizeCurriculumDraft,
  type CurriculumDraft,
} from "@/lib/programs/ebook-curriculum";

const chapterPalette = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DC2626",
  "#0891B2",
];
const APPLY_TRANSACTION_MAX_WAIT_MS = 10_000;
const APPLY_TRANSACTION_TIMEOUT_MS = 120_000;

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const draft = normalizeCurriculumDraft(
      (body.draft && typeof body.draft === "object" ? body.draft : body) as Partial<CurriculumDraft>
    );
    const programId = typeof body.programId === "string" ? body.programId.trim() : "";

    if (draft.chapters.length === 0 || draft.lessons.length === 0) {
      return NextResponse.json(
        { error: "Bản nháp cần có ít nhất 1 chương và 1 bài học." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let program = programId
        ? await tx.program.findUnique({ where: { id: programId } })
        : null;

      if (programId && !program) {
        throw new Error("Không tìm thấy chương trình được chọn.");
      }

      if (!program) {
        const lastProgram = await tx.program.aggregate({
          _max: { sortOrder: true },
        });

        program = await tx.program.create({
          data: {
            title: draft.programTitle,
            description: draft.programDescription ?? null,
            isActive: false,
            sortOrder: (lastProgram._max.sortOrder ?? -1) + 1,
          },
        });
      }

      const lastChapter = await tx.chapter.aggregate({
        _max: { sortOrder: true },
      });
      const lastMilestone = await tx.milestone.aggregate({
        where: { programId: program.id },
        _max: { sortOrder: true },
      });
      const lastSkill = await tx.skill.aggregate({
        where: { programId: program.id },
        _max: { sortOrder: true },
      });
      const nextMilestoneSortOrder = (lastMilestone._max.sortOrder ?? -1) + 1;
      const nextSkillSortOrder = (lastSkill._max.sortOrder ?? -1) + 1;
      const chapterKeyToId = new Map<string, string>();
      const lessonKeyToId = new Map<string, string>();
      const milestoneKeyToId = new Map<string, string>();
      const outcomeKeyToId = new Map<string, string>();
      const skillKeyToId = new Map<string, string>();

      const sortedChapters = [...draft.chapters].sort(
        (a, b) => a.sortOrder - b.sortOrder
      );

      for (const [index, chapter] of sortedChapters.entries()) {
        const created = await tx.chapter.create({
          data: {
            title: chapter.title,
            description: "Chương được tạo tự động từ mục lục ebook.",
            icon: "fa-book-open",
            color: chapterPalette[index % chapterPalette.length],
            sortOrder: (lastChapter._max.sortOrder ?? -1) + index + 1,
          },
        });
        chapterKeyToId.set(chapter.key, created.id);
      }

      const lessonOrderByChapter = new Map<string, number>();
      for (const lesson of draft.lessons) {
        const chapterId = chapterKeyToId.get(lesson.chapterKey);
        if (!chapterId) continue;

        const nextOrder = lessonOrderByChapter.get(lesson.chapterKey) ?? 0;
        lessonOrderByChapter.set(lesson.chapterKey, nextOrder + 1);

        const sourceMeta = [
          lesson.sourceNumber ? `mục ${lesson.sourceNumber}` : "",
          lesson.sourcePage ? `trang ${lesson.sourcePage}` : "",
        ]
          .filter(Boolean)
          .join(", ");
        const sectionContent = [
          "<p>Bài học này được tạo từ mục lục ebook và đang chờ giáo viên biên soạn nội dung chi tiết.</p>",
          sourceMeta ? `<p><strong>Nguồn ebook:</strong> ${sourceMeta}</p>` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const created = await tx.lesson.create({
          data: {
            chapterId,
            title: lesson.title,
            duration: lesson.duration,
            difficulty: lesson.difficulty,
            sortOrder: nextOrder,
            isPublished: false,
            objectiveKnowledge: null,
            objectiveSkills: null,
            objectiveAttitude: null,
            sections: {
              create: [
                {
                  title: "Nội dung",
                  content: sectionContent,
                  contentFormat: "html",
                  sortOrder: 0,
                },
              ],
            },
          },
        });

        lessonKeyToId.set(lesson.key, created.id);
      }

      for (const [index, milestone] of draft.milestones.entries()) {
        const created = await tx.milestone.create({
          data: {
            programId: program.id,
            title: milestone.title,
            description: milestone.description ?? null,
            icon: "fa-flag-checkered",
            color: chapterPalette[index % chapterPalette.length],
            sortOrder: nextMilestoneSortOrder + index,
          },
        });
        milestoneKeyToId.set(milestone.key, created.id);

        const lessonLinks = milestone.lessonKeys
          .map((lessonKey, sortOrder) => ({
            milestoneId: created.id,
            lessonId: lessonKeyToId.get(lessonKey),
            sortOrder,
          }))
          .filter((link): link is { milestoneId: string; lessonId: string; sortOrder: number } =>
            Boolean(link.lessonId)
          );

        if (lessonLinks.length > 0) {
          await tx.milestoneLesson.createMany({
            data: lessonLinks,
            skipDuplicates: true,
          });
        }
      }

      for (const outcome of draft.outcomes) {
        const milestoneId = milestoneKeyToId.get(outcome.milestoneKey);
        if (!milestoneId) continue;

        const sortOrder = Array.from(outcomeKeyToId.keys()).filter((key) => {
          const source = draft.outcomes.find((item) => item.key === key);
          return source?.milestoneKey === outcome.milestoneKey;
        }).length;

        const created = await tx.learningOutcome.create({
          data: {
            milestoneId,
            title: outcome.title,
            description: outcome.description ?? null,
            sortOrder,
          },
        });
        outcomeKeyToId.set(outcome.key, created.id);

        const lessonLinks = outcome.lessonKeys
          .map((lessonKey) => ({
            outcomeId: created.id,
            lessonId: lessonKeyToId.get(lessonKey),
          }))
          .filter((link): link is { outcomeId: string; lessonId: string } =>
            Boolean(link.lessonId)
          );

        if (lessonLinks.length > 0) {
          await tx.outcomeLesson.createMany({
            data: lessonLinks,
            skipDuplicates: true,
          });
        }
      }

      const pendingSkills = [...draft.skills];
      let safety = pendingSkills.length + 1;
      while (pendingSkills.length > 0 && safety > 0) {
        safety -= 1;
        let progressed = false;

        for (let index = pendingSkills.length - 1; index >= 0; index -= 1) {
          const skill = pendingSkills[index];
          const parentSkillId = skill.parentKey ? skillKeyToId.get(skill.parentKey) : null;
          if (skill.parentKey && !parentSkillId && safety > 0) continue;

          const created = await tx.skill.create({
            data: {
              programId: program.id,
              parentSkillId,
              title: skill.title,
              description: skill.description ?? null,
              sortOrder: nextSkillSortOrder + skillKeyToId.size,
            },
          });
          skillKeyToId.set(skill.key, created.id);
          pendingSkills.splice(index, 1);
          progressed = true;
        }

        if (!progressed) {
          safety = 0;
        }
      }

      for (const skill of pendingSkills) {
        const created = await tx.skill.create({
          data: {
            programId: program.id,
            title: skill.title,
            description: skill.description ?? null,
            sortOrder: nextSkillSortOrder + skillKeyToId.size,
          },
        });
        skillKeyToId.set(skill.key, created.id);
      }

      const outcomeSkillLinks = draft.skills.flatMap((skill) => {
        const skillId = skillKeyToId.get(skill.key);
        if (!skillId) return [];
        return skill.outcomeKeys
          .map((outcomeKey) => ({
            skillId,
            outcomeId: outcomeKeyToId.get(outcomeKey),
          }))
          .filter((link): link is { skillId: string; outcomeId: string } =>
            Boolean(link.outcomeId)
          );
      });

      if (outcomeSkillLinks.length > 0) {
        await tx.outcomeSkill.createMany({
          data: outcomeSkillLinks,
          skipDuplicates: true,
        });
      }

      return {
        programId: program.id,
        created: {
          chapters: chapterKeyToId.size,
          lessons: lessonKeyToId.size,
          milestones: milestoneKeyToId.size,
          outcomes: outcomeKeyToId.size,
          skills: skillKeyToId.size,
        },
      };
    }, {
      maxWait: APPLY_TRANSACTION_MAX_WAIT_MS,
      timeout: APPLY_TRANSACTION_TIMEOUT_MS,
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(result.programId),
      created: result.created,
    });
  } catch (error) {
    console.error("Apply ebook curriculum error:", error);
    return NextResponse.json(
      {
        error: formatApplyError(error),
      },
      { status: 500 }
    );
  }
}

function formatApplyError(error: unknown) {
  const fallback = "Không thể áp dụng bản nháp chương trình.";
  if (!(error instanceof Error)) return fallback;

  const message = error.message;
  if (
    message.includes("Transaction already closed") ||
    message.includes("expired transaction")
  ) {
    return "Quá trình áp dụng giáo trình mất nhiều thời gian hơn dự kiến. Hệ thống đã tăng thời gian xử lý, hãy thử bấm áp dụng lại. Nếu vẫn lỗi, hãy tách ebook thành ít chương hơn rồi áp dụng từng phần.";
  }

  return message || fallback;
}
