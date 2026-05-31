import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { normalizeLessonMutationPayload } from "@/lib/lessons/lesson-draft";
import { extractReferencedMediaIds } from "@/lib/lessons/lesson-media";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function verifyTeacher() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    if (sessionData.exp < Date.now()) return null;
    if (sessionData.role !== "teacher" && sessionData.role !== "admin") return null;
    return sessionData;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
        exercises: { orderBy: { sortOrder: "asc" } },
        media: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("Get lesson error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = normalizeLessonMutationPayload(await request.json());
    const referencedMediaIds = extractReferencedMediaIds(
      payload.sections.map((section) => section.content)
    );

    if (!payload.chapterId || !payload.title) {
      return NextResponse.json(
        { error: "Chương học và tên bài giảng là bắt buộc" },
        { status: 400 }
      );
    }

    const lesson = await prisma.$transaction(async (tx) => {
      await tx.section.deleteMany({ where: { lessonId: id } });
      await tx.exercise.deleteMany({ where: { lessonId: id } });

      await tx.lesson.update({
        where: { id },
        data: {
          chapterId: payload.chapterId,
          title: payload.title,
          duration: payload.duration,
          difficulty: payload.difficulty,
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
            lessonId: id,
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
            lessonId: id,
            draftId: null,
          },
        });
      }

      return tx.lesson.findUniqueOrThrow({
        where: { id },
        include: {
          sections: true,
          exercises: true,
          media: true,
        },
      });
    }, { maxWait: 20000, timeout: 60000 });

    return NextResponse.json({
      success: true,
      message: "Cập nhật bài giảng thành công!",
      lesson,
    });
  } catch (error) {
    console.error("Update lesson error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const data: { isPublished?: boolean; isLocked?: boolean; isPublicPreview?: boolean } = {};
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;
    if (typeof body.isLocked === "boolean") data.isLocked = body.isLocked;
    if (typeof body.isPublicPreview === "boolean") data.isPublicPreview = body.isPublicPreview;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Không có trường hợp lệ để cập nhật" }, { status: 400 });
    }

    const existing = await prisma.lesson.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Bài giảng không tồn tại" }, { status: 404 });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data,
      select: { id: true, isPublished: true, isLocked: true, isPublicPreview: true },
    });

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error("Patch lesson error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi, vui lòng thử lại" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { exercises: { select: { id: true } } },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Bài giảng không tồn tại" },
        { status: 404 }
      );
    }

    const exerciseIds = lesson.exercises.map((exercise) => exercise.id);
    if (exerciseIds.length > 0) {
      await prisma.submission.deleteMany({
        where: { exerciseId: { in: exerciseIds } },
      });
    }

    await prisma.userLessonTabProgress.deleteMany({ where: { lessonId: id } });
    await prisma.userProgress.deleteMany({ where: { lessonId: id } });
    await prisma.section.deleteMany({ where: { lessonId: id } });
    await prisma.exercise.deleteMany({ where: { lessonId: id } });
    await prisma.lesson.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Xóa bài giảng thành công!",
    });
  } catch (error) {
    console.error("Delete lesson error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
