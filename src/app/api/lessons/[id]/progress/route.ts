import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  buildLessonProgressTabs,
  summarizeLessonProgress,
  TAB_COMPLETION_SECONDS,
} from "@/lib/lesson-progress";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để lưu tiến độ." }, { status: 401 });
    }

    if (session.role !== "student") {
      return NextResponse.json({ error: "Chỉ học sinh mới có tiến độ học tập." }, { status: 403 });
    }

    const { id: lessonId } = await params;
    const body = await request.json();
    const tabId = typeof body.tabId === "string" ? body.tabId.trim() : "";
    const rawSecondsSpent = Number(body.secondsSpent);

    if (!tabId) {
      return NextResponse.json({ error: "Thiếu mã tab cần cập nhật." }, { status: 400 });
    }

    if (!Number.isFinite(rawSecondsSpent) || rawSecondsSpent <= 0) {
      return NextResponse.json({ error: "Thời gian học không hợp lệ." }, { status: 400 });
    }

    const secondsSpent = Math.min(Math.round(rawSecondsSpent), TAB_COMPLETION_SECONDS);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        sections: {
          select: { id: true, title: true },
          orderBy: { sortOrder: "asc" },
        },
        exercises: {
          select: { type: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Không tìm thấy bài giảng." }, { status: 404 });
    }

    const lessonTabs = buildLessonProgressTabs(lesson);
    if (!lessonTabs.some((tab) => tab.id === tabId)) {
      return NextResponse.json({ error: "Tab không thuộc bài giảng này." }, { status: 400 });
    }

    const progress = await prisma.$transaction(async (tx) => {
      const existingTab = await tx.userLessonTabProgress.findUnique({
        where: {
          userId_lessonId_tabId: {
            userId: session.userId,
            lessonId,
            tabId,
          },
        },
      });

      const nextTimeSpent = (existingTab?.timeSpent ?? 0) + secondsSpent;
      const nextCompleted = existingTab?.completed || nextTimeSpent >= TAB_COMPLETION_SECONDS;
      const now = new Date();

      if (existingTab) {
        await tx.userLessonTabProgress.update({
          where: { id: existingTab.id },
          data: {
            timeSpent: nextTimeSpent,
            completed: nextCompleted,
            lastAccess: now,
            completedAt: nextCompleted ? existingTab.completedAt ?? now : null,
          },
        });
      } else {
        await tx.userLessonTabProgress.create({
          data: {
            userId: session.userId,
            lessonId,
            tabId,
            timeSpent: nextTimeSpent,
            completed: nextCompleted,
            lastAccess: now,
            completedAt: nextCompleted ? now : null,
          },
        });
      }

      const tabRecords = await tx.userLessonTabProgress.findMany({
        where: { userId: session.userId, lessonId },
        select: {
          tabId: true,
          timeSpent: true,
          completed: true,
        },
      });

      const summary = summarizeLessonProgress(lessonTabs, tabRecords);

      await tx.userProgress.upsert({
        where: {
          userId_lessonId: {
            userId: session.userId,
            lessonId,
          },
        },
        update: {
          completed: summary.completed,
          timeSpent: summary.timeSpent,
          lastAccess: now,
        },
        create: {
          userId: session.userId,
          lessonId,
          completed: summary.completed,
          timeSpent: summary.timeSpent,
          lastAccess: now,
        },
      });

      return summary;
    });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Update lesson progress error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật tiến độ bài giảng lúc này." },
      { status: 500 }
    );
  }
}
