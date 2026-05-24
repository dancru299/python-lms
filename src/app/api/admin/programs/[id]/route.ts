import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asBoolean,
  asNullableString,
  asSortOrder,
  asString,
  getProgramDetail,
} from "@/lib/programs/program-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id } = await params;
    const program = await getProgramDetail(id);

    if (!program) {
      return NextResponse.json({ error: "Không tìm thấy chương trình" }, { status: 404 });
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Get program detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const title = asString(body.title);

    if (!title) {
      return NextResponse.json({ error: "Tên chương trình là bắt buộc" }, { status: 400 });
    }

    const existing = await prisma.program.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy chương trình" }, { status: 404 });
    }

    const isActive = asBoolean(body.isActive, false);

    await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.program.updateMany({
          where: { id: { not: id } },
          data: { isActive: false },
        });
      }

      await tx.program.update({
        where: { id },
        data: {
          title,
          description: asNullableString(body.description),
          isActive,
          sortOrder: asSortOrder(body.sortOrder, 0),
        },
      });
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(id),
    });
  } catch (error) {
    console.error("Update program error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id } = await params;
    await prisma.program.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete program error:", error);
    return NextResponse.json({ error: "Không thể xóa chương trình" }, { status: 500 });
  }
}
