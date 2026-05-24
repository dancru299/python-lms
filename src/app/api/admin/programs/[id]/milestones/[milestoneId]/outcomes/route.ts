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

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json({ error: "Tên outcome là bắt buộc" }, { status: 400 });
    }

    const lastOutcome = await prisma.learningOutcome.findFirst({
      where: { milestoneId },
      orderBy: { sortOrder: "desc" },
    });

    await prisma.learningOutcome.create({
      data: {
        milestoneId,
        title,
        description: asNullableString(body.description),
        sortOrder: asSortOrder(body.sortOrder, (lastOutcome?.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Create outcome error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
