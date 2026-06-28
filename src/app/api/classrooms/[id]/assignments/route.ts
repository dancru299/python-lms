import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId } = await params;
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, teacherId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Không tìm thấy lớp học" },
        { status: 404 }
      );
    }

    const isTeacherSide = session.role === "admin" || classroom.teacherId === session.userId;
    const isStudentMember = await prisma.classroomStudent.findFirst({
      where: { classroomId, studentId: session.userId },
      select: { id: true },
    });

    if (!isTeacherSide && !isStudentMember) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const assignments = await prisma.classroomAssignment.findMany({
      where: {
        classroomId,
        isPublished: true,
        // HS chỉ thấy bài giao cho cả lớp (không có target) hoặc giao trực tiếp cho mình.
        ...(session.role === "student"
          ? {
              OR: [
                { targets: { none: {} } },
                { targets: { some: { studentId: session.userId } } },
              ],
            }
          : {}),
      },
      include: {
        lesson: { select: { id: true, title: true } },
        submissions: session.role === "student"
          ? {
              where: { studentId: session.userId },
              take: 1,
              orderBy: { createdAt: "desc" },
            }
          : false,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const transformed = assignments.map((assignment) => {
      const mySubmission = Array.isArray(assignment.submissions)
        ? assignment.submissions[0] || null
        : null;
      // Chỉ lộ đáp án mẫu cho GV/admin, hoặc học sinh đã nộp bài (tránh xem trước đáp án).
      const canSeeAnswer = session.role !== "student" || mySubmission !== null;
      return {
        ...assignment,
        answerTemplate: canSeeAnswer ? assignment.answerTemplate : null,
        mySubmission,
        submissions: undefined,
      };
    });

    return NextResponse.json({ assignments: transformed });
  } catch (error) {
    console.error("Get classroom assignment list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

