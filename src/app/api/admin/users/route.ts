import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";

// GET - Get list of teachers and students
export async function GET() {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const [teachers, students] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["teacher", "admin"] } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "student" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ teachers, students });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
