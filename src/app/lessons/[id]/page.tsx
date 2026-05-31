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
import { getLessonGateForStudent, getStudentProgramId } from "@/lib/programs/lesson-gating";
import { getRecruitmentInfo, type RecruitmentInfo } from "@/lib/settings";
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

function LessonAccessRequiredState({ guest }: { guest: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-[2rem] border border-indigo-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <i className="fa-solid fa-lock text-2xl"></i>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Bài học dành cho học viên</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {guest ? (
              <>
                Bạn cần đăng nhập và được giáo viên thêm vào một lớp có chương trình đào tạo thì mới
                truy cập được bài học này.
              </>
            ) : (
              <>
                Bài học này thuộc chương trình đào tạo. Bạn cần được giáo viên thêm vào một lớp có
                chương trình thì lộ trình bài học mới mở ra.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {guest ? (
              <>
                <Link href="/login" className="btn btn-primary">
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Đăng nhập
                </Link>
                <Link href="/register" className="btn btn-secondary">
                  Tạo tài khoản
                </Link>
              </>
            ) : (
              <>
                <Link href="/classrooms" className="btn btn-primary">
                  <i className="fa-solid fa-users"></i>
                  Xem lớp học của tôi
                </Link>
                <Link href="/dashboard" className="btn btn-secondary">
                  <i className="fa-solid fa-arrow-left"></i>
                  Về tổng quan
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonPreviewBanner({ info }: { info: RecruitmentInfo }) {
  const isHttp = /^https?:\/\//i.test(info.ctaUrl);
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm">
        <span className="font-semibold text-amber-800">
          <i className="fa-solid fa-unlock-keyhole mr-1.5"></i>
          Bài đọc thử miễn phí
        </span>
        <span className="text-amber-700">{info.message}</span>
        {info.ctaUrl && (
          <a
            href={info.ctaUrl}
            target={isHttp ? "_blank" : undefined}
            rel={isHttp ? "noopener noreferrer" : undefined}
            className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            {info.ctaLabel}
            <i className="fa-solid fa-arrow-right ml-1 text-xs"></i>
          </a>
        )}
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

    // Access control — lessons are reserved for enrolled learners, EXCEPT those the teacher
    // marked as a public preview, which guests and not-yet-enrolled students may read as a
    // free sample (with a "contact to enroll" banner). Teachers/admins preview everything.
    // Enrolled students are then sequentially gated: a program lesson stays locked until the
    // previous one is finished.
    const isPublicPreview = lesson.isPublished && lesson.isPublicPreview;
    let showPreviewBanner = false;

    if (!session) {
      if (!isPublicPreview) {
        return <LessonAccessRequiredState guest />;
      }
      showPreviewBanner = true;
    } else if (session.role === "student") {
      const programId = await getStudentProgramId(session.userId);
      if (!programId) {
        if (!isPublicPreview) {
          return <LessonAccessRequiredState guest={false} />;
        }
        showPreviewBanner = true;
      } else {
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

    const recruitmentInfo = showPreviewBanner ? await getRecruitmentInfo() : null;

    return (
      <>
        {recruitmentInfo && <LessonPreviewBanner info={recruitmentInfo} />}
        <LessonClientPage
          initialLesson={clientLesson}
          initialUser={initialUser}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
        />
      </>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <LessonUnavailableState lessonId={id} />;
    }

    throw error;
  }
}
