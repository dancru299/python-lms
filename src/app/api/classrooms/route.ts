import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";

export async function GET() {
  try {
    const session = await getCookieSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "student") {
      const classes = await prisma.classroomStudent.findMany({
        where: { studentId: session.userId },
        include: {
          classroom: {
            include: {
              teacher: { select: { id: true, name: true, email: true } },
              _count: { select: { assignments: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });

      return NextResponse.json({
        classrooms: classes.map((item) => item.classroom),
      });
    }

    const classrooms = await prisma.classroom.findMany({
      where: session.role === "admin" ? {} : { teacherId: session.userId },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ classrooms });
  } catch (error) {
    console.error("Get classrooms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

