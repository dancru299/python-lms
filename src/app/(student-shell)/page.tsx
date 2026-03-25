import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import StudentPageFrame from "@/components/student/StudentPageFrame";

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
  const notifications = await prisma.notification.findMany({
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
  });

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
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)]">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-200">
                <i className="fa-solid fa-graduation-cap text-lg"></i>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">Python LMS</div>
                <div className="text-sm text-slate-500">Học Python theo lộ trình rõ ràng</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="btn btn-secondary">
                Đăng nhập
              </Link>
              <Link href="/register" className="btn btn-primary">
                Bắt đầu học
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
            <div className="grid gap-10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.97),_rgba(67,56,202,0.92)_58%,_rgba(6,182,212,0.82))] px-6 py-12 text-white lg:grid-cols-[1.45fr,1fr] lg:px-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-indigo-50 ring-1 ring-white/15">
                  <i className="fa-solid fa-compass-drafting"></i>
                  Giao diện học tập dễ theo dõi, dễ quản lý
                </div>
                <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                  Học Python với bố cục rõ ràng cho cả học sinh và giáo viên
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-indigo-50">
                  Theo dõi tiến độ, quản lý lớp học, giao bài và chấm bài trong một hệ thống có
                  điều hướng trực quan hơn, giúp việc học và dạy mạch lạc ngay từ lần nhìn đầu tiên.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/register" className="btn btn-primary">
                    <i className="fa-solid fa-rocket"></i>
                    Tạo tài khoản
                  </Link>
                  <Link href="/login" className="btn btn-secondary">
                    <i className="fa-solid fa-right-to-bracket"></i>
                    Tôi đã có tài khoản
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    icon: "fa-route",
                    title: "Lộ trình học rõ ràng",
                    description: "Theo chương, theo bài và theo trạng thái hoàn thành.",
                  },
                  {
                    icon: "fa-users-rectangle",
                    title: "Quản lý lớp học tập trung",
                    description: "Xem nhanh lớp học, bài tập và các việc cần xử lý.",
                  },
                  {
                    icon: "fa-pen-ruler",
                    title: "Luồng giao bài, chấm bài gọn",
                    description: "Giảm thao tác tìm kiếm, tăng khả năng theo dõi tiến độ.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg text-white">
                      <i className={`fa-solid ${item.icon}`}></i>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-indigo-50">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
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
    prisma.notification.count({
      where: { userId: session.userId, isRead: false },
    }),
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
      title="Bảng điều khiển học tập"
      subtitle="Theo dõi tiến độ, mở nhanh lớp học, xem bài chờ chấm và nắm các đầu việc quan trọng trong cùng một nơi."
      summaryPills={[
        { label: "Tiến độ tổng", value: `${progressPercent}%`, tone: "indigo" },
        { label: "Lớp đang theo học", value: classroomCount, tone: "emerald" },
        { label: "Thông báo mới", value: notificationCount, tone: "amber" },
      ]}
      primaryAction={
        nextLesson
          ? {
              href: `/lessons/${nextLesson.id}`,
              label: "Tiếp tục học",
              icon: "fa-play",
            }
          : {
              href: "/classrooms",
              label: "Mở lớp học",
              icon: "fa-users",
            }
      }
      secondaryAction={{
        href: "/profile",
        label: "Xem hồ sơ",
        icon: "fa-id-card",
      }}
      sectionLinks={[
        { href: "#tong-quan", label: "Tổng quan" },
        { href: "#lo-trinh", label: "Lộ trình học" },
        { href: "#lop-hoc", label: "Lớp học" },
        { href: "#thong-bao", label: "Thông báo" },
      ]}
    >
      <section id="tong-quan" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Bài đã hoàn thành",
            value: `${completedLessons}/${totalLessons || 0}`,
            description: totalLessons > 0 ? "Đã hoàn thành trên toàn lộ trình" : "Chưa có bài học",
            icon: "fa-circle-check",
            iconClass: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Bài đang chờ chấm",
            value: pendingSubmissions,
            description: pendingSubmissions > 0 ? "Giáo viên đang xem bài của bạn" : "Không có bài chờ chấm",
            icon: "fa-hourglass-half",
            iconClass: "bg-amber-100 text-amber-600",
          },
          {
            label: "Điểm trung bình",
            value: averageScore !== null ? `${averageScore}/10` : "Chưa có",
            description:
              averageScore !== null ? "Tính từ các bài đã được chấm" : "Điểm sẽ xuất hiện sau khi có bài được chấm",
            icon: "fa-chart-simple",
            iconClass: "bg-indigo-100 text-indigo-600",
          },
          {
            label: "Bài nên học tiếp",
            value: nextLesson ? "Sẵn sàng" : "Hoàn thành",
            description: nextLesson ? nextLesson.title : "Bạn đã học xong các bài đang mở",
            icon: "fa-flag-checkered",
            iconClass: "bg-sky-100 text-sky-600",
          },
        ].map((item) => (
          <div key={item.label} className="card rounded-[1.5rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">{item.label}</div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{item.value}</div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">{item.description}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.6fr,1fr]">
        <section id="lo-trinh" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Lộ trình học theo chương</h2>
              <p className="text-sm text-slate-500">
                Mỗi chương đều có tiến độ riêng để bạn dễ xác định đang ở đâu và nên học gì tiếp theo.
              </p>
            </div>
            <Link href="/classrooms" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Xem toàn bộ lớp học
            </Link>
          </div>

          {chapterProgress.length > 0 ? (
            <div className="space-y-5">
              {chapterProgress.map((chapter) => (
                <article key={chapter.id} className="card overflow-hidden rounded-[1.5rem]">
                  <div
                    className="border-b border-slate-200 px-5 py-5"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${chapter.color}18, rgba(255,255,255,0.96))`,
                    }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: `${chapter.color}24`, color: chapter.color }}
                        >
                          <i className={`fa-solid ${chapter.icon}`}></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{chapter.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {chapter.completed}/{chapter.lessons.length} bài đã hoàn thành
                          </p>
                        </div>
                      </div>

                      <div className="min-w-[220px]">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>Tiến độ chương</span>
                          <span className="font-semibold text-slate-900">{chapter.percent}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-slate-900 transition-all"
                            style={{ width: `${chapter.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {chapter.lessons.map((lesson, index) => {
                      const isCompleted = completedLessonIds.has(lesson.id);

                      return (
                        <Link
                          key={lesson.id}
                          href={`/lessons/${lesson.id}`}
                          className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isCompleted ? <i className="fa-solid fa-check"></i> : index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900">{lesson.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                              <span>{lesson.duration} phút</span>
                              <span>•</span>
                              <span>{getDifficultyLabel(lesson.difficulty)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`badge ${
                                isCompleted ? "badge-success" : "badge-primary"
                              }`}
                            >
                              {isCompleted ? "Đã xong" : "Tiếp tục"}
                            </span>
                            <i className="fa-solid fa-chevron-right text-slate-300"></i>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card rounded-[1.5rem] p-10 text-center text-slate-500">
              <i className="fa-solid fa-book-open text-4xl text-slate-300"></i>
              <p className="mt-4">Chưa có chương học nào khả dụng.</p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section id="thong-bao">
            <Suspense fallback={<NotificationsFallback />}>
              <StudentNotificationsSection userId={session.userId} />
            </Suspense>
          </section>

          <Suspense fallback={<ClassroomsFallback />}>
            <StudentClassroomsSection userId={session.userId} />
          </Suspense>
        </div>
      </div>
    </StudentPageFrame>
  );
}
