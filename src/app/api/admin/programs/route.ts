import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asBoolean,
  asNullableString,
  asSortOrder,
  asString,
  getAllLessonsForProgramAdmin,
  getProgramDetail,
  programDetailInclude,
} from "@/lib/programs/program-admin";

export async function GET() {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const [programs, lessonsByChapter] = await Promise.all([
      prisma.program.findMany({
        include: programDetailInclude,
        orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      getAllLessonsForProgramAdmin(),
    ]);

    return NextResponse.json({ programs, lessonsByChapter });
  } catch (error) {
    console.error("Get programs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const body = await request.json();
    const title = asString(body.title);

    if (!title) {
      return NextResponse.json({ error: "Tên chương trình là bắt buộc" }, { status: 400 });
    }

    const isActive = asBoolean(body.isActive, true);
    const lastProgram = await prisma.program.findFirst({ orderBy: { sortOrder: "desc" } });
    const sortOrder = asSortOrder(body.sortOrder, (lastProgram?.sortOrder ?? -1) + 1);

    const program = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.program.updateMany({ data: { isActive: false } });
      }

      return tx.program.create({
        data: {
          title,
          description: asNullableString(body.description),
          isActive,
          sortOrder,
        },
      });
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(program.id),
    });
  } catch (error) {
    console.error("Create program error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
