import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asNullableString,
  asSortOrder,
  asString,
  getProgramDetail,
} from "@/lib/programs/program-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId } = await params;
    const body = await request.json();
    const title = asString(body.title);

    if (!title) {
      return NextResponse.json({ error: "Tên milestone là bắt buộc" }, { status: 400 });
    }

    const program = await prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
    if (!program) {
      return NextResponse.json({ error: "Không tìm thấy chương trình" }, { status: 404 });
    }

    const lastMilestone = await prisma.milestone.findFirst({
      where: { programId },
      orderBy: { sortOrder: "desc" },
    });

    await prisma.milestone.create({
      data: {
        programId,
        title,
        description: asNullableString(body.description),
        icon: asString(body.icon) || "fa-flag-checkered",
        color: asString(body.color) || "#3B82F6",
        sortOrder: asSortOrder(body.sortOrder, (lastMilestone?.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Create milestone error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
