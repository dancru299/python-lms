import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  isDatabaseUnavailableError,
  runDatabaseOperation,
} from "@/lib/database";
import {
  buildLessonProgressTabs,
  summarizeLessonProgress,
} from "@/lib/lesson-progress";
import { processCodeBlocks, renderExerciseHtml } from "@/lib/lesson-html";
import { getLessonGateForStudent } from "@/lib/programs/lesson-gating";
import {
  serializeLessonMedia,
  type LessonContentBlock,
} from "@/lib/lessons/lesson-media";
import LessonClientPage, {
  type Lesson,
  type UserSession,
  type SiblingLesson,
} from "./LessonClientPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

function LessonUnavailableState({ lessonId }: { lessonId: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <i className="fa-solid fa-database text-2xl"></i>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Chưa thể tải bài giảng lúc này
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Kết nối tới cơ sở dữ liệu đang tạm thời gián đoạn. Nội dung bài học
            sẽ hoạt động lại khi kết nối ổn định hơn.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/lessons/${lessonId}`} className="btn btn-primary">
              <i className="fa-solid fa-rotate-right"></i>
              Thử tải lại
            </Link>
            <Link href="/" className="btn btn-secondary">
              <i className="fa-solid fa-arrow-left"></i>
              Quay lại Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonLockedState({
  requiredLessonId,
  requiredLessonTitle,
}: {
  requiredLessonId: string | null;
  requiredLessonTitle: string | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-[2rem] border border-indigo-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <i className="fa-solid fa-lock text-2xl"></i>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Bài học đang khóa</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {requiredLessonTitle ? (
              <>
                Bạn cần hoàn thành bài{" "}
                <span className="font-semibold text-slate-900">“{requiredLessonTitle}”</span> trước —
                xem hết các tab và nộp đủ bài tập về nhà — thì bài này mới mở khóa.
              </>
            ) : (
              <>Hãy hoàn thành bài học trước đó (xem hết các tab và nộp đủ bài tập về nhà) để mở khóa bài này.</>
            )}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {requiredLessonId && (
              <Link href={`/lessons/${requiredLessonId}`} className="btn btn-primary">
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                Tới bài cần hoàn thành
              </Link>
            )}
            <Link href="/dashboard" className="btn btn-secondary">
              <i className="fa-solid fa-arrow-left"></i>
              Quay lại lộ trình
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  try {
    const lesson = await runDatabaseOperation(() =>
      prisma.lesson.findUnique({
        where: { id },
        include: {
          chapter: true,
          media: { orderBy: { createdAt: "desc" } },
          sections: { orderBy: { sortOrder: "asc" } },
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: {
              submissions: session
                ? {
                    where: { userId: session.userId },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  }
                : {
                    take: 0,
                  },
            },
          },
        },
      })
    );

    if (!lesson) {
      notFound();
    }

    // Sequential gating: a student may not open a program lesson until the previous one
    // is finished. Teachers/admins are never gated so they can preview freely.
    if (session?.role === "student") {
      const gate = await getLessonGateForStudent(session.userId, id);
      if (gate.locked) {
        return (
          <LessonLockedState
            requiredLessonId={gate.requiredLessonId}
            requiredLessonTitle={gate.requiredLessonTitle}
          />
        );
      }
    }

    // Fetch sibling lessons in same chapter for prev/next navigation
    const chapterLessons = await runDatabaseOperation(() =>
      prisma.lesson.findMany({
        where: { chapterId: lesson.chapterId, isPublished: true },
        select: { id: true, title: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      })
    );
    const currentIndex = chapterLessons.findIndex((l) => l.id === id);
    const prevLesson: SiblingLesson | null =
      currentIndex > 0
        ? { id: chapterLessons[currentIndex - 1].id, title: chapterLessons[currentIndex - 1].title }
        : null;
    const nextLesson: SiblingLesson | null =
      currentIndex < chapterLessons.length - 1
        ? { id: chapterLessons[currentIndex + 1].id, title: chapterLessons[currentIndex + 1].title }
        : null;

    const lessonTabs = buildLessonProgressTabs(lesson);
    let progress = null;

    if (session?.role === "student") {
      const tabProgress = await runDatabaseOperation(() =>
        prisma.userLessonTabProgress.findMany({
          where: { userId: session.userId, lessonId: id },
          select: {
            tabId: true,
            timeSpent: true,
            completed: true,
          },
        })
      );

      progress = summarizeLessonProgress(lessonTabs, tabProgress);
    }

    const clientLesson: Lesson = {
      ...lesson,
      tabs: lessonTabs,
      progress,
      sections: lesson.sections.map((section) => ({
        ...section,
        renderedContent: section.content ? processCodeBlocks(section.content) : "",
        contentBlocks: Array.isArray(section.contentBlocks)
          ? (section.contentBlocks as unknown as LessonContentBlock[])
          : null,
      })),
      media: lesson.media.map(serializeLessonMedia),
      exercises: lesson.exercises.map(({ submissions, ...exercise }) => {
        const latestSubmission = submissions?.[0];

        return {
          ...exercise,
          mySubmission: latestSubmission
            ? {
                ...latestSubmission,
                createdAt: latestSubmission.createdAt.toISOString(),
              }
            : null,
          questionHtml: exercise.question ? renderExerciseHtml(exercise.question) : "",
        };
      }),
    };

    const initialUser: UserSession | null = session
      ? {
          id: session.userId,
          role: session.role,
          name: session.name,
        }
      : null;

    return (
      <LessonClientPage
        initialLesson={clientLesson}
        initialUser={initialUser}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
      />
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <LessonUnavailableState lessonId={id} />;
    }

    throw error;
  }
}
