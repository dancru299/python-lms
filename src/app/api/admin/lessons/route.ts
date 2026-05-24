import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { normalizeLessonMutationPayload } from "@/lib/lessons/lesson-draft";

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

export async function GET() {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = normalizeLessonMutationPayload(await request.json());

    if (!payload.chapterId || !payload.title) {
      return NextResponse.json(
        { error: "Chương học và tên bài giảng là bắt buộc" },
        { status: 400 }
      );
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId: payload.chapterId },
      orderBy: { sortOrder: "desc" },
    });
    const nextOrder = (lastLesson?.sortOrder ?? -1) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        chapterId: payload.chapterId,
        title: payload.title,
        duration: payload.duration,
        difficulty: payload.difficulty,
        sortOrder: nextOrder,
        objectiveKnowledge: payload.objectives.knowledge || null,
        objectiveSkills: payload.objectives.skills || null,
        objectiveAttitude: payload.objectives.attitude || null,
        sections: {
          create: payload.sections.map((section, index) => ({
            title: section.title,
            content: section.content,
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
      },
    });

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
