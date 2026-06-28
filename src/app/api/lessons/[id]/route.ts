import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  buildLessonProgressTabs,
  summarizeLessonProgress,
} from "@/lib/lesson-progress";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    // Bài giảng cho phép xem ẩn danh (public preview); user có thể là null.
    const user = await getSession();

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: true,
        sections: { orderBy: { sortOrder: "asc" } },
        exercises: { 
          orderBy: { sortOrder: "asc" },
          include: {
            submissions: user ? {
              where: { userId: user.userId },
              orderBy: { createdAt: "desc" },
              take: 1,
            } : false,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const lessonTabs = buildLessonProgressTabs(lesson);
    let progress = null;

    if (user?.role === "student") {
      try {
        const tabProgress = await prisma.userLessonTabProgress.findMany({
          where: { userId: user.userId, lessonId: id },
          select: {
            tabId: true,
            timeSpent: true,
            completed: true,
          },
        });

        progress = summarizeLessonProgress(lessonTabs, tabProgress);
      } catch (progressError) {
        console.error("Get lesson progress error:", progressError);
      }
    }

    // Transform exercises to include mySubmission
    const transformedLesson = {
      ...lesson,
      tabs: lessonTabs,
      progress,
      exercises: lesson.exercises.map(exercise => ({
        ...exercise,
        mySubmission: exercise.submissions?.[0] || null,
        submissions: undefined, // Remove full submissions array
      })),
    };

    return NextResponse.json(transformedLesson);
  } catch (error) {
    console.error("Get lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
