import Link from "next/link";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import { requireTeacher } from "@/lib/session";

function DashboardCardSkeleton() {
  return (
    <div className="card rounded-[1.5rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-9 w-20 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

function PendingSubmissionsFallback() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card rounded-[1.5rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-6 w-3/4 animate-pulse rounded-xl bg-slate-200" />
              <div className="mt-3 h-4 w-48 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-8 w-16 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsFallback() {
  return (
    <section className="card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
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

async function AdminPendingSubmissionsSection() {
  const recentSubmissions = await prisma.submission.findMany({
    where: { status: "pending" },
    select: {
      id: true,
      maxScore: true,
      exercise: {
        select: {
          title: true,
          lesson: {
            select: {
              title: true,
              chapter: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-4">
      {recentSubmissions.length > 0 ? (
        recentSubmissions.map((submission) => (
          <Link
            key={submission.id}
            href={`/admin/grading/${submission.id}`}
            className="card block rounded-[1.5rem] p-5 transition hover:shadow-md"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-primary">
                    {submission.exercise.lesson.chapter.title}
                  </span>
                  <span className="text-sm text-slate-500">
                    {submission.exercise.lesson.title}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {submission.exercise.title}
                </h3>
                <div className="mt-2 text-sm text-slate-500">
                  Học sinh:{" "}
                  <span className="font-medium text-slate-900">
                    {submission.user.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="badge badge-warning">Chờ chấm</span>
                <span className="badge badge-primary">
                  {submission.maxScore} điểm
                </span>
              </div>
            </div>
          </Link>
        ))
      ) : (
        <div className="card rounded-[1.5rem] p-10 text-center text-slate-500">
          <i className="fa-solid fa-circle-check text-4xl text-emerald-500"></i>
          <p className="mt-4">Hiện không có bài nào đang chờ chấm.</p>
        </div>
      )}
    </div>
  );
}

async function AdminNotificationsSection({ userId }: { userId: string }) {
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
    take: 8,
  });

  return (
    <NotificationInbox
      emptyMessage="Chưa có thông báo mới dành cho giáo viên."
      notifications={notifications}
    />
  );
}

export default async function AdminPage() {
  const session = await requireTeacher();
  const classroomFilter =
    session.role === "admin" ? {} : { teacherId: session.userId };

  const [lessons, pendingSubmissions, users, notificationCount, classroomCount] =
    await Promise.all([
      prisma.lesson.count(),
      prisma.submission.count({ where: { status: "pending" } }),
      prisma.user.count({ where: { role: "student" } }),
      prisma.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
      prisma.classroom.count({ where: classroomFilter }),
    ]);

  return (
    <TeacherPageFrame
      title={
        session.role === "admin"
          ? "Trung tâm quản trị"
          : "Bảng điều khiển giảng dạy"
      }
      subtitle="Giữ dashboard gọn hơn: chỉ còn những chỉ số cần nhìn nhanh, hàng chờ chấm và khu thông báo điều hướng tới đúng màn hình xử lý."
      summaryPills={[
        { label: "Bài chờ chấm", value: pendingSubmissions, tone: "amber" },
        { label: "Lớp học", value: classroomCount, tone: "indigo" },
        { label: "Thông báo mới", value: notificationCount, tone: "slate" },
      ]}
      primaryAction={{
        href: "/admin/grading",
        label: "Mở khu chấm bài",
        icon: "fa-pen-ruler",
      }}
      secondaryAction={{
        href: "/admin/classrooms",
        label: "Mở lớp học",
        icon: "fa-users-rectangle",
      }}
      sectionLinks={[
        { href: "#tong-quan", label: "Tổng quan" },
        { href: "#hang-cho", label: "Hàng chờ chấm" },
        { href: "#thong-bao", label: "Thông báo" },
      ]}
    >
      <section id="tong-quan" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Bài chờ chấm",
            value: pendingSubmissions,
            description: "Ưu tiên xử lý bài đang chờ phản hồi.",
            icon: "fa-hourglass-half",
            iconClass: "bg-amber-100 text-amber-600",
          },
          {
            label: "Lớp học",
            value: classroomCount,
            description: "Số lớp bạn đang quản lý.",
            icon: "fa-users-rectangle",
            iconClass: "bg-indigo-100 text-indigo-600",
          },
          {
            label: "Bài giảng",
            value: lessons,
            description: "Kho nội dung đang có trong hệ thống.",
            icon: "fa-book-open",
            iconClass: "bg-sky-100 text-sky-600",
          },
          {
            label: "Học sinh",
            value: users,
            description: "Tổng số học sinh đang có.",
            icon: "fa-user-graduate",
            iconClass: "bg-emerald-100 text-emerald-600",
          },
        ].map((item) => (
          <div key={item.label} className="card rounded-[1.5rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  {item.label}
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">
                  {item.value}
                </div>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}
              >
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {item.description}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.55fr,1fr]">
        <section id="hang-cho" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Hàng chờ chấm bài
              </h2>
              <p className="text-sm text-slate-500">
                Khu làm việc chính cho giáo viên, giữ gọn để vào thẳng bài làm
                của học sinh.
              </p>
            </div>
            <Link
              href="/admin/grading"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Xem tất cả
            </Link>
          </div>

          <Suspense fallback={<PendingSubmissionsFallback />}>
            <AdminPendingSubmissionsSection />
          </Suspense>
        </section>

        <div id="thong-bao">
          <Suspense fallback={<NotificationsFallback />}>
            <AdminNotificationsSection userId={session.userId} />
          </Suspense>
        </div>
      </div>
    </TeacherPageFrame>
  );
}
