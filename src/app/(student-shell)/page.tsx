import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/notifications";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import StudentPageFrame from "@/components/student/StudentPageFrame";
import LandingPage from "./LandingPage";

function getDifficultyLabel(level: string) {
  if (level === "beginner") return "Cơ bản";
  if (level === "intermediate") return "Trung bình";
  if (level === "advanced") return "Nâng cao";
  return level;
}

function NotificationsFallback() {
  return (
    <section className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClassroomsFallback() {
  return (
    <section className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function StudentNotificationsSection({ userId }: { userId: string }) {
  const notifications = await prisma.notification
    .findMany({
      where: { userId, isRead: false },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    .catch(() => []);

  return <NotificationInbox emptyMessage="Hiện chưa có thông báo nào cần xử lý." notifications={notifications} />;
}

async function StudentClassroomsSection({ userId }: { userId: string }) {
  const classroomEnrollments = await prisma.classroomStudent.findMany({
    where: { studentId: userId },
    include: {
      classroom: {
        include: {
          teacher: { select: { name: true } },
          _count: { select: { assignments: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    take: 4,
  });

  return (
    <section id="lop-hoc" className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Lớp học nổi bật</h2>
        <Link href="/classrooms" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Mở danh sách
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {classroomEnrollments.length > 0 ? (
          classroomEnrollments.map((item) => (
            <Link
              key={item.id}
              href={`/classrooms/${item.classroom.id}`}
              className="block rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{item.classroom.name}</div>
                  <div className="mt-1 text-sm text-slate-500">GV: {item.classroom.teacher.name}</div>
                </div>
                <span className="badge badge-primary font-mono">{item.classroom.code}</span>
              </div>
              <div className="mt-3 text-sm text-slate-500">
                {item.classroom._count.assignments} bài tập được giao
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Chưa có lớp học nào để hiển thị.
          </div>
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return <LandingPage />;
  }

  if (session.role === "teacher" || session.role === "admin") {
    redirect("/admin");
  }

  const [chapters, userProgress, submissions, notificationCount, classroomCount] = await Promise.all([
    prisma.chapter.findMany({
      where: { isLocked: false },
      select: {
        id: true,
        title: true,
        icon: true,
        color: true,
        lessons: {
          where: { isLocked: false, isPublished: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            duration: true,
            difficulty: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.userProgress.findMany({
      where: { userId: session.userId },
      select: {
        lessonId: true,
        completed: true,
      },
    }),
    prisma.submission.findMany({
      where: { userId: session.userId },
      select: {
        status: true,
        score: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getUnreadNotificationCount(session.userId),
    prisma.classroomStudent.count({
      where: { studentId: session.userId },
    }),
  ]);

  const completedLessonIds = new Set(
    userProgress.filter((item) => item.completed).map((item) => item.lessonId)
  );

  const totalLessons = chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  const completedLessons = completedLessonIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const pendingSubmissions = submissions.filter((submission) => submission.status === "pending").length;
  const gradedSubmissions = submissions.filter(
    (submission) => submission.status === "graded" && submission.score !== null
  );
  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((sum, submission) => sum + (submission.score || 0), 0) /
            gradedSubmissions.length
        )
      : null;

  const chapterProgress = chapters.map((chapter) => {
    const completed = chapter.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
    const firstRemainingLesson =
      chapter.lessons.find((lesson) => !completedLessonIds.has(lesson.id)) || chapter.lessons[0] || null;

    return {
      ...chapter,
      completed,
      percent: chapter.lessons.length > 0 ? Math.round((completed / chapter.lessons.length) * 100) : 0,
      firstRemainingLesson,
    };
  });

  const nextLesson =
    chapterProgress.find((chapter) => chapter.firstRemainingLesson)?.firstRemainingLesson || null;

  return (
    <StudentPageFrame
      title={`Xin chào, ${session.name.split(" ").pop()} 👋`}
      summaryPills={[
        { label: "Tiến độ", value: `${progressPercent}%`, tone: "indigo" },
        { label: "Lớp học", value: classroomCount, tone: "emerald" },
        ...(pendingSubmissions > 0
          ? [{ label: "Chờ chấm", value: pendingSubmissions, tone: "amber" as const }]
          : []),
      ]}
    >
      {/* Continue learning banner */}
      {nextLesson ? (
        <Link
          href={`/lessons/${nextLesson.id}`}
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-4 text-white shadow-md shadow-indigo-200/50 transition hover:shadow-lg hover:shadow-indigo-200/60"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-100">
              Tiếp tục học
            </div>
            <div className="mt-0.5 truncate text-base font-bold">{nextLesson.title}</div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <i className="fa-solid fa-play text-sm"></i>
          </div>
        </Link>
      ) : totalLessons > 0 ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800">Hoàn thành toàn bộ lộ trình!</div>
            <div className="text-xs text-emerald-600">Bạn đã học xong tất cả bài đang mở.</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        {/* Roadmap — main content */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Lộ trình học</h2>
              <p className="text-sm text-slate-400">{completedLessons}/{totalLessons || 0} bài đã hoàn thành</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden w-32 sm:block">
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-500">{progressPercent}%</span>
            </div>
          </div>

          {chapterProgress.length > 0 ? (
            <div className="space-y-4">
              {chapterProgress.map((chapter) => (
                <article key={chapter.id} className="card overflow-hidden rounded-2xl">
                  <div
                    className="border-b border-slate-100 px-5 py-4"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${chapter.color}12, rgba(255,255,255,1))`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
                          style={{ backgroundColor: `${chapter.color}20`, color: chapter.color }}
                        >
                          <i className={`fa-solid ${chapter.icon}`}></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{chapter.title}</h3>
                          <p className="text-xs text-slate-400">
                            {chapter.completed}/{chapter.lessons.length} bài
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden w-24 sm:block">
                          <div className="h-1 rounded-full bg-slate-200">
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{ width: `${chapter.percent}%`, backgroundColor: chapter.color }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{chapter.percent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {chapter.lessons.map((lesson, index) => {
                      const isCompleted = completedLessonIds.has(lesson.id);

                      return (
                        <Link
                          key={lesson.id}
                          href={`/lessons/${lesson.id}`}
                          className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {isCompleted ? <i className="fa-solid fa-check"></i> : index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800">
                              {lesson.title}
                            </div>
                            <div className="text-xs text-slate-400">
                              {lesson.duration} phút · {getDifficultyLabel(lesson.difficulty)}
                            </div>
                          </div>

                          <i className="fa-solid fa-chevron-right shrink-0 text-xs text-slate-300"></i>
                        </Link>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card rounded-2xl p-10 text-center text-slate-400">
              <i className="fa-solid fa-book-open text-3xl text-slate-200"></i>
              <p className="mt-3 text-sm">Chưa có chương học nào khả dụng.</p>
            </div>
          )}
        </section>

        {/* Right column: notifications + classrooms */}
        <div className="space-y-4">
          <Suspense fallback={<NotificationsFallback />}>
            <StudentNotificationsSection userId={session.userId} />
          </Suspense>

          <Suspense fallback={<ClassroomsFallback />}>
            <StudentClassroomsSection userId={session.userId} />
          </Suspense>
        </div>
      </div>
    </StudentPageFrame>
  );
}
