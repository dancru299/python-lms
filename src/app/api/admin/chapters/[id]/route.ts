import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-token";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

// PUT - Update chapter
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, icon, color, isLocked } = body;

    if (!title) {
      return NextResponse.json({ error: "Tên chương là bắt buộc" }, { status: 400 });
    }

    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        title,
        description: description || null,
        icon: icon || "fa-book",
        color: color || "#3B82F6",
        isLocked: isLocked ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công!",
      chapter,
    });
  } catch (error) {
    console.error("Update chapter error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

// DELETE - Delete chapter
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await verifyTeacher();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if chapter has lessons
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: { _count: { select: { lessons: true } } },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chương không tồn tại" }, { status: 404 });
    }

    if (chapter._count.lessons > 0) {
      return NextResponse.json(
        { error: `Không thể xóa vì chương còn ${chapter._count.lessons} bài giảng` },
        { status: 400 }
      );
    }

    await prisma.chapter.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Xóa chương thành công!",
    });
  } catch (error) {
    console.error("Delete chapter error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
