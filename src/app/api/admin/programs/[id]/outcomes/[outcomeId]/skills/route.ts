import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  asString,
  assertProgramOwnsOutcome,
  assertProgramOwnsSkill,
  getProgramDetail,
} from "@/lib/programs/program-admin";

interface RouteParams {
  params: Promise<{ id: string; outcomeId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, outcomeId } = await params;
    const outcome = await assertProgramOwnsOutcome(programId, outcomeId);
    if (!outcome) {
      return NextResponse.json({ error: "Không tìm thấy outcome" }, { status: 404 });
    }

    const body = await request.json();
    const skillId = asString(body.skillId);
    if (!skillId) {
      return NextResponse.json({ error: "Thiếu kỹ năng cần gắn" }, { status: 400 });
    }

    const skill = await assertProgramOwnsSkill(programId, skillId);
    if (!skill) {
      return NextResponse.json({ error: "Không tìm thấy kỹ năng" }, { status: 404 });
    }

    await prisma.outcomeSkill.upsert({
      where: { outcomeId_skillId: { outcomeId, skillId } },
      update: {},
      create: { outcomeId, skillId },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Attach outcome skill error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, outcomeId } = await params;
    const outcome = await assertProgramOwnsOutcome(programId, outcomeId);
    if (!outcome) {
      return NextResponse.json({ error: "Không tìm thấy outcome" }, { status: 404 });
    }

    const body = await request.json();
    const skillId = asString(body.skillId);
    if (!skillId) {
      return NextResponse.json({ error: "Thiếu kỹ năng cần bỏ gắn" }, { status: 400 });
    }

    await prisma.outcomeSkill.deleteMany({ where: { outcomeId, skillId } });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Detach outcome skill error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
