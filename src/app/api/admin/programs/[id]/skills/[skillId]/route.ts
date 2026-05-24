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
  params: Promise<{ id: string; skillId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, skillId } = await params;
    const skill = await assertProgramOwnsSkill(programId, skillId);
    if (!skill) {
      return NextResponse.json({ error: "Không tìm thấy kỹ năng" }, { status: 404 });
    }

    const body = await request.json();
    const title = asString(body.title);
    if (!title) {
      return NextResponse.json({ error: "Tên kỹ năng là bắt buộc" }, { status: 400 });
    }

    const parentSkillId = asString(body.parentSkillId) || null;
    if (parentSkillId === skillId) {
      return NextResponse.json({ error: "Kỹ năng không thể là cha của chính nó" }, { status: 400 });
    }

    if (parentSkillId) {
      const parent = await assertProgramOwnsSkill(programId, parentSkillId);
      if (!parent) {
        return NextResponse.json({ error: "Kỹ năng cha không thuộc chương trình" }, { status: 400 });
      }
    }

    await prisma.skill.update({
      where: { id: skillId },
      data: {
        title,
        description: asNullableString(body.description),
        parentSkillId,
        sortOrder: asSortOrder(body.sortOrder, 0),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Update skill error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, skillId } = await params;
    const skill = await assertProgramOwnsSkill(programId, skillId);
    if (!skill) {
      return NextResponse.json({ error: "Không tìm thấy kỹ năng" }, { status: 404 });
    }

    await prisma.skill.delete({ where: { id: skillId } });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Delete skill error:", error);
    return NextResponse.json({ error: "Không thể xóa kỹ năng" }, { status: 500 });
  }
}
