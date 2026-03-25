import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import StudentPageFrame from "@/components/student/StudentPageFrame";
import { requireAuth } from "@/lib/session";

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

async function StudentClassroomNotificationsSection({ userId }: { userId: string }) {
  const notifications = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <NotificationInbox
      emptyMessage="Chưa có thông báo mới liên quan tới lớp học."
      notifications={notifications}
    />
  );
}

export default async function StudentClassroomsPage() {
  const session = await requireAuth();

  if (session.role !== "student") {
    redirect(session.role === "admin" || session.role === "teacher" ? "/admin/classrooms" : "/");
  }

  const [classroomEnrollments, notificationCount] = await Promise.all([
    prisma.classroomStudent.findMany({
      where: { studentId: session.userId },
      include: {
        classroom: {
          include: {
            teacher: { select: { name: true, email: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.notification.count({
      where: { userId: session.userId, isRead: false },
    }),
  ]);

  const totalAssignments = classroomEnrollments.reduce(
    (sum, item) => sum + item.classroom._count.assignments,
    0
  );

  return (
    <StudentPageFrame
      title="Lớp học của tôi"
      subtitle="Danh sách lớp được giữ gọn để bạn mở nhanh lớp đang học, còn các việc phát sinh sẽ đi qua thông báo để tránh phải dò trong nhiều khối thông tin."
      summaryPills={[
        { label: "Số lớp đang học", value: classroomEnrollments.length, tone: "indigo" },
        { label: "Tổng bài tập", value: totalAssignments, tone: "amber" },
        {
          label: "Thông báo mới",
          value: notificationCount,
          tone: "slate",
        },
      ]}
      primaryAction={{
        href: "/",
        label: "Về tổng quan",
        icon: "fa-house",
      }}
      secondaryAction={{
        href: "/profile",
        label: "Hồ sơ",
        icon: "fa-id-card",
      }}
      sectionLinks={[
        { href: "#danh-sach", label: "Danh sách lớp" },
        { href: "#thong-bao", label: "Thông báo" },
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-[1.7fr,1fr]">
        <section id="danh-sach" className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Danh sách lớp học</h2>
            <p className="text-sm text-slate-500">
              Tập trung vào lớp học và hành động mở lớp. Các đầu việc mới sẽ được đẩy sang thẻ thông báo bên phải.
            </p>
          </div>

          {classroomEnrollments.length === 0 ? (
            <div className="card rounded-[1.5rem] p-10 text-center text-slate-500">
              <i className="fa-solid fa-users-slash text-4xl text-slate-300"></i>
              <p className="mt-4">Bạn chưa được thêm vào lớp học nào.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {classroomEnrollments.map((item) => (
                <Link
                  key={item.id}
                  href={`/classrooms/${item.classroom.id}`}
                  className="card rounded-[1.5rem] p-5 transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <span className="badge badge-primary font-mono">{item.classroom.code}</span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900">{item.classroom.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">Giáo viên: {item.classroom.teacher.name}</p>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span>{item.classroom._count.assignments} bài tập đã giao</span>
                    <span>{new Date(item.joinedAt).toLocaleDateString("vi-VN")}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm font-semibold text-indigo-600">
                    <span>Mở lớp học</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div id="thong-bao">
          <Suspense fallback={<NotificationsFallback />}>
            <StudentClassroomNotificationsSection userId={session.userId} />
          </Suspense>
        </div>
      </div>
    </StudentPageFrame>
  );
}
