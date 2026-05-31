import { NextRequest, NextResponse } from "next/server";
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

// GET - List all chapters
export async function GET() {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chapters = await prisma.chapter.findMany({
      include: {
        _count: { select: { lessons: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(chapters);
  } catch (error) {
    console.error("Get chapters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create chapter
export async function POST(request: NextRequest) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, icon, color } = body;

    if (!title) {
      return NextResponse.json({ error: "Tên chương là bắt buộc" }, { status: 400 });
    }

    // Get next sort order
    const lastChapter = await prisma.chapter.findFirst({
      orderBy: { sortOrder: "desc" },
    });
    const nextOrder = (lastChapter?.sortOrder ?? -1) + 1;

    const chapter = await prisma.chapter.create({
      data: {
        title,
        description: description || null,
        icon: icon || "fa-book",
        color: color || "#3B82F6",
        sortOrder: nextOrder,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tạo chương thành công!",
      chapter,
    });
  } catch (error) {
    console.error("Create chapter error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
