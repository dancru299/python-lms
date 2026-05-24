import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asNullableString,
  asSortOrder,
  asString,
  assertProgramOwnsMilestone,
  getProgramDetail,
} from "@/lib/programs/program-admin";

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, milestoneId } = await params;
    const milestone = await assertProgramOwnsMilestone(programId, milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: "Không tìm thấy milestone" }, { status: 404 });
    }

    const body = await request.json();
    const title = asString(body.title);
    if (!title) {
      return NextResponse.json({ error: "Tên milestone là bắt buộc" }, { status: 400 });
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title,
        description: asNullableString(body.description),
        icon: asString(body.icon) || "fa-flag-checkered",
        color: asString(body.color) || "#3B82F6",
        sortOrder: asSortOrder(body.sortOrder, 0),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Update milestone error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, milestoneId } = await params;
    const milestone = await assertProgramOwnsMilestone(programId, milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: "Không tìm thấy milestone" }, { status: 404 });
    }

    await prisma.milestone.delete({ where: { id: milestoneId } });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Delete milestone error:", error);
    return NextResponse.json({ error: "Không thể xóa milestone" }, { status: 500 });
  }
}
