import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-token";

// Verify admin/teacher
async function verifyTeacher() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = verifySession(sessionCookie.value);
    if (!sessionData) return null;
    if (sessionData.role !== "teacher" && sessionData.role !== "admin") return null;
    return sessionData;
  } catch {
    return null;
  }
}

// GET - Get list of teachers and students
export async function GET() {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
