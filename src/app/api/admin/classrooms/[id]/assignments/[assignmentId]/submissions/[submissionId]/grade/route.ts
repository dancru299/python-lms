import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string; submissionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId, assignmentId, submissionId } = await params;

    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        classroom: { select: { teacherId: true } },
        submissions: {
          where: { id: submissionId },
          select: {
            id: true,
            studentId: true,
            status: true,
          },
          take: 1,
        },
      },
    });

    if (!assignment || assignment.classroomId !== classroomId) {
      return NextResponse.json(
        { error: "Không tìm th?y bài giao" },
        { status: 404 },
      );
    }

    const targetSubmission = assignment.submissions[0];
    if (!targetSubmission) {
      return NextResponse.json(
        { error: "Không tìm thấy bài nộp" },
        { status: 404 },
      );
    }

    if (targetSubmission.status === "graded") {
      return NextResponse.json(
        { error: "Bài này đã được chấm điểm rồi" },
        { status: 409 },
      );
    }

    if (
      session.role !== "admin" &&
      assignment.classroom.teacherId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Không có quy?n ch?m bài" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const score = Number(body.score);
    const feedback =
      typeof body.feedback === "string" ? body.feedback.trim() : null;

    if (Number.isNaN(score) || score < 0) {
      return NextResponse.json({ error: "Ðiểm không h?p l?" }, { status: 400 });
    }

    const boundedScore = Math.min(score, assignment.maxScore);

    const submission = await prisma.classroomAssignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: boundedScore,
        feedback,
        status: "graded",
        gradedAt: new Date(),
        gradedBy: session.userId,
      },
    });

    const studentId = targetSubmission.studentId;
    if (studentId) {
      await prisma.notification.create({
        data: {
          userId: studentId,
          type: "classroom_submission_graded",
          title: "Bài làm đã được chấm",
          message: `Bài "${assignment.title}" đã được chấm ${boundedScore}/${assignment.maxScore} điểm${feedback ? " và có nhận xét từ giáo viên." : "."}`,
          link: `/classrooms/${classroomId}/assignments/${assignmentId}`,
        },
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Grade assignment submission error:", error);
    return NextResponse.json(
      { error: "Ðã x?y ra l?i khi ch?m bài" },
      { status: 500 },
    );
  }
}
