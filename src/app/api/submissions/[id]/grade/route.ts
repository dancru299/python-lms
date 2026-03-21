import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// Helper to get session
async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    if (sessionData.exp < Date.now()) return null;
    return sessionData;
  } catch {
    return null;
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Grade a submission
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const score = Number(body.score);
    const maxScore = Number(body.maxScore);
    const feedback = body.feedback;

    if (Number.isNaN(score) || Number.isNaN(maxScore) || score < 0) {
      return NextResponse.json(
        { error: "Điểm số là bắt buộc" },
        { status: 400 }
      );
    }

    // Check if submission exists with exercise info
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { 
        exercise: { 
          include: { lesson: true } 
        },
        user: { select: { name: true } },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Bài nộp không tồn tại" },
        { status: 404 }
      );
    }

    // Update submission with grade
    const updated = await prisma.submission.update({
      where: { id },
      data: {
        score: Math.min(score, maxScore),
        maxScore,
        feedback: feedback || null,
        status: "graded",
        gradedAt: new Date(),
        gradedBy: session.userId,
      },
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: "submission_graded",
        title: "Bài tập đã được chấm điểm!",
        message: `Bài "${submission.exercise.title}" của bạn đã được chấm: ${score}/${maxScore} điểm${feedback ? ". Có nhận xét từ giáo viên." : ""}`,
        link: `/lessons/${submission.exercise.lessonId}?tab=bai-tap`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Chấm điểm thành công!",
      submission: {
        id: updated.id,
        score: updated.score,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("Grading error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
