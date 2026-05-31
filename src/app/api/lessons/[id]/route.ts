import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-token";
import {
  buildLessonProgressTabs,
  summarizeLessonProgress,
} from "@/lib/lesson-progress";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get current user from session
async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const sessionData = verifySession(sessionCookie.value);
    if (!sessionData) return null;
    return sessionData;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

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
