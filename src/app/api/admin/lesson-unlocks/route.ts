import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";

// Teacher manual override of sequential gating: grant or revoke access to a single
// locked lesson for a single student (e.g. for a makeup).

export async function POST(request: NextRequest) {
  const { session, response } = await requireTeacherSessionJson();
  if (response) return response;

  const { studentId, lessonId } = await request.json();
  if (!studentId || !lessonId) {
    return NextResponse.json({ error: "studentId và lessonId là bắt buộc" }, { status: 400 });
  }

  await prisma.lessonUnlock.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    update: { createdById: session.userId },
    create: { studentId, lessonId, createdById: session.userId },
  });

  return NextResponse.json({ success: true, unlocked: true });
}

export async function DELETE(request: NextRequest) {
  const { response } = await requireTeacherSessionJson();
  if (response) return response;

  const { studentId, lessonId } = await request.json();
  if (!studentId || !lessonId) {
    return NextResponse.json({ error: "studentId và lessonId là bắt buộc" }, { status: 400 });
  }

  await prisma.lessonUnlock.deleteMany({ where: { studentId, lessonId } });

  return NextResponse.json({ success: true, unlocked: false });
}
