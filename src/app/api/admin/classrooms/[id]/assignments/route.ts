import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";
import { convertDocxToHtml } from "@/lib/docx-html";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function verifyTeacherAccess(classroomId: string) {
  const session = await getCookieSessionUser();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, teacherId: true },
  });

  if (!classroom) {
    return { error: "Không tìm th?y l?p h?c", status: 404 as const };
  }

  if (session.role !== "admin" && classroom.teacherId !== session.userId) {
    return { error: "Không có quy?n truy c?p l?p này", status: 403 as const };
  }

  return { session, classroom };
}

async function parseUploadedDocx(file: FormDataEntryValue | null) {
  if (!file || typeof file === "string") {
    return null;
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("invalid_docx_file");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const converted = await convertDocxToHtml(buffer);

  if (!converted.html) {
    throw new Error("empty_docx_content");
  }

  return {
    questionHtml: converted.html,
    questionDocx: buffer.toString("base64"),
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const access = await verifyTeacherAccess(id);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const assignments = await prisma.classroomAssignment.findMany({
      where: { classroomId: id },
      select: {
        id: true,
        title: true,
        type: true,
        durationMinutes: true,
        maxScore: true,
        createdAt: true,
        lesson: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Get classroom assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: classroomId } = await params;
    const access = await verifyTeacherAccess(classroomId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const formData = await request.formData();
    const type = String(formData.get("type") || "").trim();
    const lessonId = String(formData.get("lessonId") || "").trim() || null;
    const exerciseId = String(formData.get("exerciseId") || "").trim() || null;
    const title = String(formData.get("title") || "").trim();
    const description =
      String(formData.get("description") || "").trim() || null;
    const maxScore = Number(formData.get("maxScore") || 10);

    if (type !== "homework" && type !== "test") {
      return NextResponse.json(
        { error: "Lo?i bài giao không h?p l?" },
        { status: 400 },
      );
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: "Vui lòng ch?n bài gi?ng liên quan" },
        { status: 400 },
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, title: true },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Bài gi?ng không t?n t?i" },
        { status: 404 },
      );
    }

    let questionHtml: string | null = null;
    let questionDocx: string | null = null;
    let answerTemplate: string | null = null;
    let durationMinutes: number | null = null;
    const uploadedQuestionDocx = formData.get("questionDocx");

    if (type === "homework") {
      if (uploadedQuestionDocx) {
        try {
          const parsedDocx = await parseUploadedDocx(uploadedQuestionDocx);
          if (!parsedDocx) {
            return NextResponse.json(
              { error: "Vui lòng tải lên file đề .docx cho BTVN" },
              { status: 400 },
            );
          }

          questionHtml = parsedDocx.questionHtml;
          questionDocx = parsedDocx.questionDocx;
        } catch (error) {
          if (error instanceof Error && error.message === "invalid_docx_file") {
            return NextResponse.json(
              { error: "Chỉ chấp nhận file .docx" },
              { status: 400 },
            );
          }

          return NextResponse.json(
            { error: "Không thể chuyển file .docx sang nội dung hiển thị" },
            { status: 400 },
          );
        }
      } else if (exerciseId) {
        const exercise = await prisma.exercise.findUnique({
          where: { id: exerciseId },
          select: {
            id: true,
            lessonId: true,
            title: true,
            question: true,
            answer: true,
            points: true,
          },
        });

        if (!exercise || exercise.lessonId !== lessonId) {
          return NextResponse.json(
            { error: "Bài t?p không h?p l?" },
            { status: 400 },
          );
        }

        questionHtml = exercise.question || null;
        answerTemplate = exercise.answer || null;
      } else {
        questionHtml =
          String(formData.get("questionHtml") || "").trim() || null;
        answerTemplate =
          String(formData.get("answerTemplate") || "").trim() || null;
      }

        if (!questionHtml) {
          return NextResponse.json(
            { error: "BTVN c?n có n?i dung d?" },
            { status: 400 },
          );
      }
    }

    if (type === "test") {
      durationMinutes = Number(formData.get("durationMinutes") || 0);
      if (![15, 45, 60].includes(durationMinutes)) {
        return NextResponse.json(
          { error: "Th?i gian làm bài ch? h? tr? 15, 45 ho?c 60 phút" },
          { status: 400 },
        );
      }

      if (!uploadedQuestionDocx) {
        return NextResponse.json(
          { error: "Vui lòng t?i lên file d? .docx" },
          { status: 400 },
        );
      }

      try {
        const parsedDocx = await parseUploadedDocx(uploadedQuestionDocx);
        if (!parsedDocx) {
          return NextResponse.json(
            { error: "Vui lòng t?i lên file d? .docx" },
            { status: 400 },
          );
        }

        questionHtml = parsedDocx.questionHtml;
        questionDocx = parsedDocx.questionDocx;
      } catch (error) {
        if (error instanceof Error && error.message === "invalid_docx_file") {
          return NextResponse.json(
            { error: "Ch? ch?p nh?n file .docx" },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { error: "Không th? chuy?n file .docx sang n?i dung hi?n th?" },
          { status: 400 },
        );
      }
    }

    const assignment = await prisma.classroomAssignment.create({
      data: {
        classroomId,
        lessonId,
        type,
        title:
          title ||
          `${type === "test" ? "Bài kiểm tra" : "Bài t?p v? nhà"} - ${lesson.title}`,
        description,
        durationMinutes,
        questionHtml,
        questionDocx,
        answerTemplate,
        maxScore: maxScore > 0 ? maxScore : 10,
        createdBy: access.session.userId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        durationMinutes: true,
        maxScore: true,
        createdAt: true,
        lesson: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });

    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      select: { studentId: true },
    });

    if (classroomStudents.length > 0) {
      await prisma.notification.createMany({
        data: classroomStudents.map((student) => ({
          userId: student.studentId,
          type: type === "test" ? "classroom_test_created" : "classroom_assignment_created",
          title: type === "test" ? "Có bài kiểm tra mới" : "Có bài tập mới",
          message: `${assignment.title} đã được giao trong lớp học. Nhấn để mở và làm bài.`,
          link: `/classrooms/${classroomId}/assignments/${assignment.id}`,
        })),
      });
    }

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Create classroom assignment error:", error);
    return NextResponse.json(
      { error: "Ðã x?y ra l?i khi t?o bài giao" },
      { status: 500 },
    );
  }
}
