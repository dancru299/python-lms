import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asNullableString,
  asSortOrder,
  asString,
  assertProgramOwnsSkill,
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
      return NextResponse.json({ error: "Tên kỹ năng là bắt buộc" }, { status: 400 });
    }

    const program = await prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
    if (!program) {
      return NextResponse.json({ error: "Không tìm thấy chương trình" }, { status: 404 });
    }

    const parentSkillId = asString(body.parentSkillId) || null;
    if (parentSkillId) {
      const parent = await assertProgramOwnsSkill(programId, parentSkillId);
      if (!parent) {
        return NextResponse.json({ error: "Kỹ năng cha không thuộc chương trình" }, { status: 400 });
      }
    }

    const lastSkill = await prisma.skill.findFirst({
      where: { programId, parentSkillId },
      orderBy: { sortOrder: "desc" },
    });

    await prisma.skill.create({
      data: {
        programId,
        parentSkillId,
        title,
        description: asNullableString(body.description),
        sortOrder: asSortOrder(body.sortOrder, (lastSkill?.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Create skill error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
