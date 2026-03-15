import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCookieSessionUser } from "@/lib/cookie-session";

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getCookieSessionUser();
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

