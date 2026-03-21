import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify teacher role
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

// GET - Get lesson for editing
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
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("Get lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update lesson
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { chapterId, title, duration, difficulty, objectives, sections, exercises } = body;

    if (!chapterId || !title) {
      return NextResponse.json(
        { error: "Chương học và tên bài giảng là bắt buộc" },
        { status: 400 }
      );
    }

    // Delete existing sections and exercises
    await prisma.section.deleteMany({ where: { lessonId: id } });
    await prisma.exercise.deleteMany({ where: { lessonId: id } });

    // Update lesson with new sections and exercises
    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        chapterId,
        title,
        duration: duration || 120,
        difficulty: difficulty || "beginner",
        objectiveKnowledge: objectives?.knowledge || null,
        objectiveSkills: objectives?.skills || null,
        objectiveAttitude: objectives?.attitude || null,
        sections: {
          create: (sections || []).map((s: { title: string; content: string }, i: number) => ({
            title: s.title,
            content: s.content,
            sortOrder: i,
          })),
        },
        exercises: {
          create: (exercises || []).map((e: {
            type: string;
            title: string;
            question: string;
            answer: string;
            difficulty: string;
            points: number;
            answerVisible?: boolean;
          }, i: number) => ({
            type: e.type || "practice",
            title: e.title,
            question: e.question,
            answer: e.answer,
            difficulty: e.difficulty || "easy",
            points: e.points || 10,
            sortOrder: i,
            answerVisible: e.answerVisible ?? (e.type === "practice"),
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

// DELETE - Delete lesson
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({ 
      where: { id },
      include: { exercises: { select: { id: true } } }
    });
    
    if (!lesson) {
      return NextResponse.json({ error: "Bài giảng không tồn tại" }, { status: 404 });
    }

    // Delete in order due to foreign key constraints:
    // 1. Delete submissions for all exercises
    const exerciseIds = lesson.exercises.map(e => e.id);
    if (exerciseIds.length > 0) {
      await prisma.submission.deleteMany({ 
        where: { exerciseId: { in: exerciseIds } } 
      });
    }
    
    // 2. Delete tab progress and user progress
    await prisma.userLessonTabProgress.deleteMany({ where: { lessonId: id } });
    await prisma.userProgress.deleteMany({ where: { lessonId: id } });
    
    // 3. Delete sections
    await prisma.section.deleteMany({ where: { lessonId: id } });
    
    // 4. Delete exercises
    await prisma.exercise.deleteMany({ where: { lessonId: id } });
    
    // 5. Delete lesson
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
