import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assignmentId } = await params;

    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        classroom: {
          include: {
            teacher: { select: { id: true, name: true, email: true } },
          },
        },
        lesson: { select: { id: true, title: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Không tìm thấy bài giao" },
        { status: 404 }
      );
    }

    const isTeacherSide = session.role === "admin" || assignment.classroom.teacherId === session.userId;
    const isStudentMember = await prisma.classroomStudent.findFirst({
      where: {
        classroomId: assignment.classroomId,
        studentId: session.userId,
      },
      select: { id: true },
    });

    if (!isTeacherSide && !isStudentMember) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Bài giao cho một số HS cụ thể => HS ngoài danh sách không được xem.
    if (!isTeacherSide) {
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
            { error: "Không có quyền truy cập" },
            { status: 403 }
          );
        }
      }
    }

    const mySubmission = session.role === "student"
      ? await prisma.classroomAssignmentSubmission.findUnique({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: session.userId,
            },
          },
        })
      : null;

    // Chỉ lộ đáp án mẫu cho GV/admin, hoặc học sinh đã nộp bài (tránh xem trước đáp án).
    const canSeeAnswer = isTeacherSide || mySubmission !== null;
    const safeAssignment = canSeeAnswer
      ? assignment
      : { ...assignment, answerTemplate: null };

    return NextResponse.json({ assignment: safeAssignment, mySubmission });
  } catch (error) {
    console.error("Get assignment info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

