import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";
import {
  normalizeScheduleRules,
  regenerateClassroomSessions,
} from "@/lib/classroom-schedule";

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        scheduleRules: {
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        },
        sessions: {
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            status: true,
          },
        },
        students: {
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
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Không tìm th?y l?p h?c" }, { status: 404 });
    }

    if (session.role !== "admin" && classroom.teacherId !== session.userId) {
      return NextResponse.json({ error: "Không có quy?n truy c?p l?p này" }, { status: 403 });
    }

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error("Get classroom detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      teacherId,
      studentIds,
    }: {
      name?: string;
      description?: string | null;
      teacherId?: string;
      studentIds?: string[];
    } = body;
    const startDate = parseDateOnly(body.startDate);
    const endDate = parseDateOnly(body.endDate);
    const scheduleRules = normalizeScheduleRules(body.scheduleRules);

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      select: {
        id: true,
        teacherId: true,
      },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Không tìm thấy lớp học" }, { status: 404 });
    }

    if (session.role !== "admin" && classroom.teacherId !== session.userId) {
      return NextResponse.json({ error: "Không có quyền sửa lớp học này" }, { status: 403 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên lớp là bắt buộc" }, { status: 400 });
    }

    const nextTeacherId = session.role === "admin" ? teacherId || classroom.teacherId : classroom.teacherId;
    const nextStudentIds = Array.isArray(studentIds) ? studentIds : [];

    const updated = await prisma.$transaction(async (tx) => {
      const updatedClassroom = await tx.classroom.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          teacherId: nextTeacherId,
          startDate,
          endDate,
        },
      });

      await tx.classroomStudent.deleteMany({
        where: { classroomId: id },
      });

      if (nextStudentIds.length > 0) {
        await tx.classroomStudent.createMany({
          data: nextStudentIds.map((studentId) => ({
            classroomId: id,
            studentId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.classroomScheduleRule.deleteMany({
        where: { classroomId: id },
      });

      if (scheduleRules.length > 0) {
        await tx.classroomScheduleRule.createMany({
          data: scheduleRules.map((rule) => ({
            classroomId: id,
            weekday: rule.weekday,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
          skipDuplicates: true,
        });
      }

      return updatedClassroom;
    });

    await regenerateClassroomSessions(id);

    return NextResponse.json({
      success: true,
      message: "Cập nhật lớp học thành công",
      classroom: updated,
    });
  } catch (error) {
    console.error("Update classroom error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới được xóa lớp học" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!classroom) {
      return NextResponse.json({ error: "Không tìm thấy lớp học" }, { status: 404 });
    }

    await prisma.classroom.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Xóa lớp học thành công",
    });
  } catch (error) {
    console.error("Delete classroom error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

