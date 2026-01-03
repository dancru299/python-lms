import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// Helper to get session and verify teacher role
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

// GET - List all chapters with lessons for admin
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new lesson
export async function POST(request: NextRequest) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chapterId, title, duration, difficulty, objectives, sections, exercises } = body;

    if (!chapterId || !title) {
      return NextResponse.json(
        { error: "Chương học và tên bài giảng là bắt buộc" },
        { status: 400 }
      );
    }

    // Get next sort order
    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId },
      orderBy: { sortOrder: "desc" },
    });
    const nextOrder = (lastLesson?.sortOrder ?? -1) + 1;

    // Create lesson with sections and exercises
    const lesson = await prisma.lesson.create({
      data: {
        chapterId,
        title,
        duration: duration || 120,
        difficulty: difficulty || "beginner",
        sortOrder: nextOrder,
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
          }, i: number) => ({
            type: e.type || "practice",
            title: e.title,
            question: e.question,
            answer: e.answer,
            difficulty: e.difficulty || "easy",
            points: e.points || 10,
            sortOrder: i,
            answerVisible: e.type === "practice", // Practice visible, homework not
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
