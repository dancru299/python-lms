import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { convertDocxToHtml } from "@/lib/docx-html";

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId, assignmentId } = await params;

    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            teacherId: true,
          },
        },
        lesson: { select: { id: true, title: true } },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: {
                    age: true,
                    gender: true,
                    gradeLevel: true,
                    school: true,
                    phone: true,
                  },
                },
              },
            },
            grader: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!assignment || assignment.classroomId !== classroomId) {
      return NextResponse.json({ error: "Không tìm th?y bài giao" }, { status: 404 });
    }

    if (session.role !== "admin" && assignment.classroom.teacherId !== session.userId) {
      return NextResponse.json({ error: "Không có quy?n truy c?p" }, { status: 403 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Get assignment detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Sửa bài kiểm tra đã giao: cho phép upload đè đề .docx và chỉnh tiêu đề/điểm/thời gian/hạn nộp.
// Học sinh chỉ cần tải lại trang là thấy đề mới (vẫn là cùng một bài, không tạo bài khác).
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId, assignmentId } = await params;

    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        classroomId: true,
        type: true,
        classroom: { select: { teacherId: true } },
      },
    });

    if (!assignment || assignment.classroomId !== classroomId) {
      return NextResponse.json({ error: "Không tìm thấy bài giao" }, { status: 404 });
    }

    if (session.role !== "admin" && assignment.classroom.teacherId !== session.userId) {
      return NextResponse.json({ error: "Không có quyền sửa bài này" }, { status: 403 });
    }

    const formData = await request.formData();
    const data: {
      title?: string;
      maxScore?: number;
      durationMinutes?: number | null;
      dueAt?: Date | null;
      questionHtml?: string;
      questionDocx?: string;
    } = {};

    const title = String(formData.get("title") || "").trim();
    if (title) {
      data.title = title;
    }

    const maxScoreRaw = String(formData.get("maxScore") || "").trim();
    if (maxScoreRaw) {
      const maxScore = Number(maxScoreRaw);
      if (Number.isFinite(maxScore) && maxScore > 0) {
        data.maxScore = maxScore;
      }
    }

    // Thời gian làm bài: "none"/"0"/rỗng => không giới hạn (null).
    const durationRaw = String(formData.get("durationMinutes") || "").trim();
    if (durationRaw) {
      if (durationRaw === "none" || durationRaw === "0") {
        data.durationMinutes = null;
      } else {
        const durationMinutes = Number(durationRaw);
        if (![15, 45, 60].includes(durationMinutes)) {
          return NextResponse.json(
            { error: "Thời gian làm bài chỉ hỗ trợ 15, 45, 60 phút hoặc không giới hạn" },
            { status: 400 },
          );
        }
        data.durationMinutes = durationMinutes;
      }
    }

    // Hạn nộp: "none" => bỏ hạn; có ngày => dùng ngày đó; rỗng => giữ nguyên (không đổi).
    const dueAtRaw = String(formData.get("dueAt") || "").trim();
    if (dueAtRaw === "none") {
      data.dueAt = null;
    } else if (dueAtRaw) {
      const parsed = new Date(dueAtRaw);
      if (!Number.isNaN(parsed.getTime())) {
        data.dueAt = parsed;
      }
    }

    // Upload đè đề .docx (tùy chọn): có file mới thì thay nội dung đề.
    const uploaded = formData.get("questionDocx");
    if (uploaded && typeof uploaded !== "string") {
      if (!uploaded.name.toLowerCase().endsWith(".docx")) {
        return NextResponse.json({ error: "Chỉ chấp nhận file .docx" }, { status: 400 });
      }
      const buffer = Buffer.from(await uploaded.arrayBuffer());
      const converted = await convertDocxToHtml(buffer);
      if (!converted.html) {
        return NextResponse.json(
          { error: "Không thể đọc nội dung từ file .docx" },
          { status: 400 },
        );
      }
      data.questionHtml = converted.html;
      data.questionDocx = buffer.toString("base64");
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Không có thay đổi nào để cập nhật" },
        { status: 400 },
      );
    }

    const updated = await prisma.classroomAssignment.update({
      where: { id: assignmentId },
      data,
      select: {
        id: true,
        title: true,
        maxScore: true,
        durationMinutes: true,
        dueAt: true,
      },
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error("Update classroom assignment error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật bài kiểm tra" },
      { status: 500 },
    );
  }
}

