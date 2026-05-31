import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-token";
import { getLessonGateForStudent, getStudentProgramId } from "@/lib/programs/lesson-gating";

// Helper to get session
async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = verifySession(sessionCookie.value);
    if (!sessionData) return null;
    return sessionData;
  } catch {
    return null;
  }
}

// POST - Create submission
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only students can submit
    if (session.role === "teacher" || session.role === "admin") {
      return NextResponse.json(
        { error: "Giáo viên không thể nộp bài tập" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { exerciseId, content, maxScore } = body;

    if (!exerciseId || !content) {
      return NextResponse.json(
        { error: "Exercise ID và nội dung là bắt buộc" },
        { status: 400 }
      );
    }

    // Check if exercise exists with lesson info
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { 
        lesson: { 
          include: { chapter: true } 
        } 
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Bài tập không tồn tại" },
        { status: 404 }
      );
    }

    // Only enrolled learners may submit — mirror the lesson page access gate so a
    // non-enrolled student can't submit by calling the API directly.
    const programId = await getStudentProgramId(session.userId);
    if (!programId) {
      return NextResponse.json(
        { error: "Bạn cần được thêm vào một lớp có chương trình đào tạo để nộp bài." },
        { status: 403 }
      );
    }

    // Don't let a student submit homework for a lesson that is still locked for them.
    const gate = await getLessonGateForStudent(session.userId, exercise.lessonId);
    if (gate.locked) {
      return NextResponse.json(
        {
          error: gate.requiredLessonTitle
            ? `Bài này đang khóa. Hãy hoàn thành "${gate.requiredLessonTitle}" trước.`
            : "Bài này đang khóa. Hãy hoàn thành bài học trước đó.",
        },
        { status: 403 }
      );
    }

    // Check if already submitted
    const existingSubmission = await prisma.submission.findFirst({
      where: { exerciseId, userId: session.userId },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "Bạn đã nộp bài này rồi" },
        { status: 400 }
      );
    }

    // Get student info
    const student = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        exerciseId,
        userId: session.userId,
        content,
        maxScore: maxScore || exercise.points,
        status: "pending",
      },
    });

    // Notify all teachers about new submission
    const teachers = await prisma.user.findMany({
      where: { role: { in: ["teacher", "admin"] } },
      select: { id: true },
    });

    // Create notifications for teachers
    await prisma.notification.createMany({
      data: teachers.map(teacher => ({
        userId: teacher.id,
        type: "new_submission",
        title: "Có bài tập mới cần chấm",
        message: `${student?.name} đã nộp bài "${exercise.title}" trong bài học "${exercise.lesson.title}"`,
        link: `/admin/grading/${submission.id}`,
      })),
    });

    return NextResponse.json({
      id: submission.id,
      status: submission.status,
      content: submission.content,
      createdAt: submission.createdAt,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}

// GET - Get user's submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");

    const where: Record<string, unknown> = { userId: session.userId };
    if (exerciseId) {
      where.exerciseId = exerciseId;
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: { exercise: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi" },
      { status: 500 }
    );
  }
}
