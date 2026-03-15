import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";

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

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profile: {
          select: {
            age: true,
            gender: true,
            gradeLevel: true,
            school: true,
            phone: true,
          },
        },
        studentClassrooms: {
          include: {
            classroom: {
              select: { id: true, name: true, teacherId: true },
            },
          },
        },
      },
    });

    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Không tìm th?y h?c sinh" }, { status: 404 });
    }

    if (session.role !== "admin") {
      const canView = student.studentClassrooms.some(
        (item) => item.classroom.teacherId === session.userId
      );

      if (!canView) {
        return NextResponse.json({ error: "Không có quy?n truy c?p" }, { status: 403 });
      }
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Get student profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

