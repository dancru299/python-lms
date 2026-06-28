import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { normalizeLessonMutationPayload } from "@/lib/lessons/lesson-draft";
import {
  collectMediaIdsFromBlocks,
  extractReferencedMediaIds,
} from "@/lib/lessons/lesson-media";
import { sanitizeLessonMutationHtml } from "@/lib/sanitize-html";

export async function GET() {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const chapters = await prisma.chapter.findMany({
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { exercises: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(chapters);
  } catch (error) {
    console.error("Get lessons error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTeacherSessionJson();
    if (!auth.session) return auth.response;
    const { session } = auth;

    const payload = sanitizeLessonMutationHtml(
      normalizeLessonMutationPayload(await request.json())
    );

    if (!payload.chapterId || !payload.title) {
      return NextResponse.json(
        { error: "Chương học và tên bài giảng là bắt buộc" },
        { status: 400 }
      );
    }

    const blockMediaIds = new Set<string>();
    for (const section of payload.sections) {
      collectMediaIdsFromBlocks(section.contentBlocks, blockMediaIds);
    }
    const referencedMediaIds = Array.from(
      new Set([
        ...extractReferencedMediaIds(payload.sections.map((section) => section.content)),
        ...blockMediaIds,
      ])
    );

    const lesson = await prisma.$transaction(async (tx) => {
      // Khóa tư vấn (advisory lock) theo chương: hai giáo viên cùng bấm "Tạo bài giảng"
      // cho cùng chương sẽ KHÔNG còn cùng đọc max sortOrder rồi ghi trùng. Lock giữ tới
      // hết transaction nên tiến trình sau phải đợi tiến trình trước commit. Tính
      // sortOrder NẰM TRONG transaction để đảm bảo đúng thứ tự.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payload.chapterId}))`;

      const lastLesson = await tx.lesson.findFirst({
        where: { chapterId: payload.chapterId },
        orderBy: { sortOrder: "desc" },
      });
      const nextOrder = (lastLesson?.sortOrder ?? -1) + 1;

      const createdLesson = await tx.lesson.create({
        data: {
          chapterId: payload.chapterId,
          title: payload.title,
          duration: payload.duration,
          difficulty: payload.difficulty,
          theme: payload.theme === "default" ? null : payload.theme,
          sortOrder: nextOrder,
          objectiveKnowledge: payload.objectives.knowledge || null,
          objectiveSkills: payload.objectives.skills || null,
          objectiveAttitude: payload.objectives.attitude || null,
          sections: {
            create: payload.sections.map((section, index) => ({
              title: section.title,
              content: section.content,
              contentFormat: section.contentFormat,
              contentBlocks: section.contentBlocks as never,
              sortOrder: index,
            })),
          },
          exercises: {
            create: payload.exercises.map((exercise, index) => ({
              type: exercise.type,
              title: exercise.title,
              question: exercise.question,
              answer: exercise.answer,
              difficulty: exercise.difficulty,
              points: exercise.points,
              sortOrder: index,
              answerVisible: exercise.answerVisible,
            })),
          },
        },
        include: {
          sections: true,
          exercises: true,
          media: true,
        },
      });

      if (payload.draftId) {
        await tx.lessonMedia.updateMany({
          where: {
            draftId: payload.draftId,
            createdById: session.userId,
          },
          data: {
            lessonId: createdLesson.id,
            draftId: null,
          },
        });
      }

      if (referencedMediaIds.length > 0) {
        await tx.lessonMedia.updateMany({
          where: {
            id: { in: referencedMediaIds },
            createdById: session.userId,
          },
          data: {
            lessonId: createdLesson.id,
            draftId: null,
          },
        });
      }

      return tx.lesson.findUniqueOrThrow({
        where: { id: createdLesson.id },
        include: {
          sections: true,
          exercises: true,
          media: true,
        },
      });
    }, { maxWait: 20000, timeout: 60000 });

    return NextResponse.json({
      success: true,
      message: "Tạo bài giảng thành công!",
      lesson,
    });
  } catch (error) {
    console.error("Create lesson error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
