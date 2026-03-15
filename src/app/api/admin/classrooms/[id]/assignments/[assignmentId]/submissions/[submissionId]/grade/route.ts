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
      include: { classroom: { select: { teacherId: true } } },
    });

    if (!assignment || assignment.classroomId !== classroomId) {
      return NextResponse.json({ error: "Không tìm th?y bài giao" }, { status: 404 });
    }

    if (session.role !== "admin" && assignment.classroom.teacherId !== session.userId) {
      return NextResponse.json({ error: "Không có quy?n ch?m bài" }, { status: 403 });
    }

    const body = await request.json();
    const score = Number(body.score);
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : null;

    if (Number.isNaN(score) || score < 0) {
      return NextResponse.json({ error: "Ði?m không h?p l?" }, { status: 400 });
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

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Grade assignment submission error:", error);
    return NextResponse.json({ error: "Ðã x?y ra l?i khi ch?m bài" }, { status: 500 });
  }
}

