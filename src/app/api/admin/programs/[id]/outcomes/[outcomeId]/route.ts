import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asNullableString,
  asSortOrder,
  asString,
  assertProgramOwnsOutcome,
  getProgramDetail,
} from "@/lib/programs/program-admin";

interface RouteParams {
  params: Promise<{ id: string; outcomeId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, outcomeId } = await params;
    const outcome = await assertProgramOwnsOutcome(programId, outcomeId);
    if (!outcome) {
      return NextResponse.json({ error: "Không tìm thấy outcome" }, { status: 404 });
    }

    const body = await request.json();
    const title = asString(body.title);
    if (!title) {
      return NextResponse.json({ error: "Tên outcome là bắt buộc" }, { status: 400 });
    }

    await prisma.learningOutcome.update({
      where: { id: outcomeId },
      data: {
        title,
        description: asNullableString(body.description),
        sortOrder: asSortOrder(body.sortOrder, 0),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Update outcome error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, outcomeId } = await params;
    const outcome = await assertProgramOwnsOutcome(programId, outcomeId);
    if (!outcome) {
      return NextResponse.json({ error: "Không tìm thấy outcome" }, { status: 404 });
    }

    await prisma.learningOutcome.delete({ where: { id: outcomeId } });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Delete outcome error:", error);
    return NextResponse.json({ error: "Không thể xóa outcome" }, { status: 500 });
  }
}
