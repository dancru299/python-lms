import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";

// GET - List all chapters
export async function GET() {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

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
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

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
