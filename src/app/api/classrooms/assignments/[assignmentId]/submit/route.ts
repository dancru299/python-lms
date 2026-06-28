import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "student") {
      return NextResponse.json(
        { error: "Chỉ học sinh được nộp bài" },
        { status: 403 }
      );
    }

    const { assignmentId } = await params;
    const body = await request.json();
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json(
        { error: "Vui lòng nhập nội dung bài làm" },
        { status: 400 }
      );
    }

    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        classroomId: true,
        maxScore: true,
        type: true,
        title: true,
        isPublished: true,
        dueAt: true,
        classroom: {
          select: {
            name: true,
            teacherId: true,
          },
        },
      },
    });

    if (!assignment || !assignment.isPublished) {
      return NextResponse.json(
        { error: "Không tìm thấy bài giao" },
        { status: 404 }
      );
    }

    const membership = await prisma.classroomStudent.findFirst({
      where: {
        classroomId: assignment.classroomId,
        studentId: session.userId,
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Bạn không thuộc lớp học này" },
        { status: 403 }
      );
    }

    // Bài giao cho một số HS cụ thể => HS ngoài danh sách không được nộp.
    const targetCount = await prisma.classroomAssignmentTarget.count({
      where: { assignmentId },
    });
    if (targetCount > 0) {
      const isTargeted = await prisma.classroomAssignmentTarget.findUnique({
        where: {
          assignmentId_studentId: { assignmentId, studentId: session.userId },
        },
        select: { id: true },
      });
      if (!isTargeted) {
        return NextResponse.json(
          { error: "Bài này không được giao cho bạn" },
          { status: 403 }
        );
      }
    }

    // Mỗi học sinh chỉ được nộp MỘT lần. Đã có bài nộp => không cho nộp lại.
    const existing = await prisma.classroomAssignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: session.userId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bạn đã nộp bài này rồi, không thể nộp lại." },
        { status: 409 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });

    const isLate = assignment.dueAt ? new Date() > assignment.dueAt : false;

    let submission;
    try {
      submission = await prisma.classroomAssignmentSubmission.create({
        data: {
          assignmentId,
          studentId: session.userId,
          content,
          status: "submitted",
          isLate,
        },
      });
    } catch (err) {
      // Phòng trường hợp double-submit cùng lúc: vi phạm unique (assignmentId, studentId).
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Bạn đã nộp bài này rồi, không thể nộp lại." },
          { status: 409 }
        );
      }
      throw err;
    }

    await prisma.notification.create({
      data: {
        userId: assignment.classroom.teacherId,
        type: "classroom_submission_created",
        title: assignment.type === "test" ? "Có bài kiểm tra vừa nộp" : "Có bài tập vừa nộp",
        message: `${student?.name || "Học sinh"} đã nộp bài "${assignment.title}" của lớp ${assignment.classroom.name}${isLate ? " (nộp muộn)" : ""}.`,
        link: `/admin/classrooms/${assignment.classroomId}/assignments/${assignmentId}#submission-${submission.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Nộp bài thành công",
      submission,
    });
  } catch (error) {
    console.error("Submit classroom assignment error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi nộp bài" },
      { status: 500 }
    );
  }
}

