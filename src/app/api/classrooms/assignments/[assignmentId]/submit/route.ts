import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "student") {
      return NextResponse.json({ error: "Ch? h?c sinh du?c n?p bài" }, { status: 403 });
    }

    const { assignmentId } = await params;
    const body = await request.json();
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json({ error: "Vui lòng nh?p n?i dung bài làm" }, { status: 400 });
    }

    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        classroomId: true,
        maxScore: true,
        type: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm th?y bài giao" }, { status: 404 });
    }

    const membership = await prisma.classroomStudent.findFirst({
      where: {
        classroomId: assignment.classroomId,
        studentId: session.userId,
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "B?n không thu?c l?p h?c này" }, { status: 403 });
    }

    const submission = await prisma.classroomAssignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: session.userId,
        },
      },
      create: {
        assignmentId,
        studentId: session.userId,
        content,
        status: "submitted",
      },
      update: {
        content,
        status: "submitted",
        score: null,
        feedback: null,
        gradedAt: null,
        gradedBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "N?p bài thành công",
      submission,
    });
  } catch (error) {
    console.error("Submit classroom assignment error:", error);
    return NextResponse.json({ error: "Ðã x?y ra l?i khi n?p bài" }, { status: 500 });
  }
}

