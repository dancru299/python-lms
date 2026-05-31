import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  normalizeScheduleRules,
  regenerateClassroomSessions,
} from "@/lib/classroom-schedule";

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Generate random code
function generateCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Verify admin/teacher
async function verifyTeacher() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString()
    );
    if (sessionData.exp < Date.now()) return null;
    if (sessionData.role !== "teacher" && sessionData.role !== "admin") return null;
    return sessionData;
  } catch {
    return null;
  }
}

// GET - List classrooms
export async function GET() {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classrooms = await prisma.classroom.findMany({
      where: session.role === "admin" ? {} : { teacherId: session.userId },
      include: {
        teacher: { select: { name: true, email: true } },
        students: {
          include: { student: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(classrooms);
  } catch (error) {
    console.error("Get classrooms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create classroom
export async function POST(request: NextRequest) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới được tạo lớp học" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, teacherId, studentIds } = body;
    const programId =
      typeof body.programId === "string" && body.programId.trim() ? body.programId.trim() : null;
    const startDate = parseDateOnly(body.startDate);
    const endDate = parseDateOnly(body.endDate);
    const scheduleRules = normalizeScheduleRules(body.scheduleRules);

    if (!name || !teacherId) {
      return NextResponse.json(
        { error: "Tên lớp và giáo viên là bắt buộc" },
        { status: 400 }
      );
    }

    if (programId) {
      const program = await prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
      if (!program) {
        return NextResponse.json({ error: "Chương trình đào tạo không tồn tại" }, { status: 400 });
      }
    }

    // Generate unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.classroom.findUnique({ where: { code } });
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    // Create classroom
    const classroom = await prisma.classroom.create({
      data: {
        name,
        description: description || null,
        teacherId,
        programId,
        code,
        startDate,
        endDate,
        students: studentIds?.length
          ? {
              create: studentIds.map((studentId: string) => ({
                studentId,
              })),
            }
          : undefined,
        scheduleRules: scheduleRules.length
          ? {
              create: scheduleRules.map((rule) => ({
                weekday: rule.weekday,
                startTime: rule.startTime,
                endTime: rule.endTime,
              })),
            }
          : undefined,
      },
      include: {
        teacher: { select: { name: true } },
        students: true,
      },
    });

    await regenerateClassroomSessions(classroom.id);

    return NextResponse.json({
      success: true,
      message: "Tạo lớp học thành công!",
      classroom,
    });
  } catch (error) {
    console.error("Create classroom error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
