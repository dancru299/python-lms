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

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
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

