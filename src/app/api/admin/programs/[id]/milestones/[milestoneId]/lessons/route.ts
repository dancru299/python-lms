import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
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
    const lessonId = asString(body.lessonId);
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu bài học cần gắn" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: "Không tìm thấy bài học" }, { status: 404 });
    }

    const lastLink = await prisma.milestoneLesson.findFirst({
      where: { milestoneId },
      orderBy: { sortOrder: "desc" },
    });

    await prisma.milestoneLesson.upsert({
      where: { milestoneId_lessonId: { milestoneId, lessonId } },
      update: { sortOrder: asSortOrder(body.sortOrder, lastLink?.sortOrder ?? 0) },
      create: {
        milestoneId,
        lessonId,
        sortOrder: asSortOrder(body.sortOrder, (lastLink?.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Attach milestone lesson error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) return response;

    const { id: programId, milestoneId } = await params;
    const milestone = await assertProgramOwnsMilestone(programId, milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: "Không tìm thấy milestone" }, { status: 404 });
    }

    const body = await request.json();
    const lessonId = asString(body.lessonId);
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu bài học cần bỏ gắn" }, { status: 400 });
    }

    await prisma.milestoneLesson.deleteMany({ where: { milestoneId, lessonId } });

    return NextResponse.json({
      success: true,
      program: await getProgramDetail(programId),
    });
  } catch (error) {
    console.error("Detach milestone lesson error:", error);
    return NextResponse.json({ error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
