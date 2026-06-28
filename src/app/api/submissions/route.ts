import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUserSessionJson } from "@/lib/api-auth";
import { getLessonGateForStudent, getStudentProgramId } from "@/lib/programs/lesson-gating";

// POST - Create submission
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserSessionJson();
    if (!auth.session) return auth.response;
    const { session } = auth;

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

    // Notify teachers about the submission, but collapse all homework of one
    // lesson by one student into a SINGLE notification per teacher that updates
    // as more is submitted — instead of one separate notification per exercise.
    const [teachers, totalExercises, submittedCount] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["teacher", "admin"] } },
        select: { id: true },
      }),
      prisma.exercise.count({ where: { lessonId: exercise.lessonId } }),
      prisma.submission.count({
        where: { userId: session.userId, exercise: { lessonId: exercise.lessonId } },
      }),
    ]);

    const groupKey = `lesson-homework:${exercise.lessonId}:${session.userId}`;
    const studentName = student?.name ?? "Học sinh";
    const message =
      submittedCount >= totalExercises
        ? `${studentName} đã nộp đủ ${totalExercises}/${totalExercises} bài tập trong bài học "${exercise.lesson.title}" — cần chấm.`
        : `${studentName} đã nộp ${submittedCount}/${totalExercises} bài tập trong bài học "${exercise.lesson.title}" — cần chấm.`;

    // Upsert one notification per teacher keyed by (teacher, lesson, student):
    // first submission creates it, later submissions refresh the count, bump it
    // back to unread and to the top of the list.
    await prisma.$transaction(
      teachers.map((teacher) =>
        prisma.notification.upsert({
          where: { userId_groupKey: { userId: teacher.id, groupKey } },
          create: {
            userId: teacher.id,
            type: "new_submission",
            title: "Có bài tập cần chấm",
            message,
            link: "/admin/grading",
            groupKey,
          },
          update: {
            message,
            link: "/admin/grading",
            isRead: false,
            createdAt: new Date(),
          },
        })
      )
    );

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
    const auth = await requireUserSessionJson();
    if (!auth.session) return auth.response;
    const { session } = auth;

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
