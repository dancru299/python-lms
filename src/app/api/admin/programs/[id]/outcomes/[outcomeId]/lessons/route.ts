import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import { asString, assertProgramOwnsOutcome, getProgramDetail } from "@/lib/programs/program-admin";

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
    const lessonId = asString(body.lessonId);
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu bài học cần gắn" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: "Không tìm thấy bài học" }, { status: 404 });
    }

    await prisma.outcomeLesson.upsert({
      where: { outcomeId_lessonId: { outcomeId, lessonId } },
      update: {},
      create: { outcomeId, lessonId },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Attach outcome lesson error:", error);
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
    const lessonId = asString(body.lessonId);
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu bài học cần bỏ gắn" }, { status: 400 });
    }

    await prisma.outcomeLesson.deleteMany({ where: { outcomeId, lessonId } });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Detach outcome lesson error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
