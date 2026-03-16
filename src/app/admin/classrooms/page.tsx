import Link from "next/link";
import prisma from "@/lib/prisma";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import TeacherChrome from "@/components/teacher/TeacherChrome";
import { requireTeacher } from "@/lib/session";

export default async function ClassroomsPage() {
  const session = await requireTeacher();
  const classroomFilter = session.role === "admin" ? {} : { teacherId: session.userId };

  const [classrooms, notifications] = await Promise.all([
    prisma.classroom.findMany({
      where: classroomFilter,
      include: {
        teacher: { select: { name: true } },
        students: {
          include: {
            student: { select: { name: true, email: true } },
          },
        },
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: session.userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const totalStudents = classrooms.reduce((sum, classroom) => sum + classroom.students.length, 0);
  const totalAssignments = classrooms.reduce((sum, classroom) => sum + classroom._count.assignments, 0);

  return (
    <TeacherChrome
      active="classrooms"
      userName={session.name}
      role={session.role as "teacher" | "admin"}
      title="Quản lý lớp học"
      subtitle="Trang lớp học được rút gọn về danh sách lớp và khu thông báo. Khi có bài mới, học sinh nộp bài hay bài cần xử lý, bạn đi qua thông báo để mở đúng nơi cần làm."
      notificationCount={notifications.length}
      summaryPills={[
        { label: "Số lớp", value: classrooms.length, tone: "indigo" },
        { label: "Tổng học sinh", value: totalStudents, tone: "amber" },
        { label: "Thông báo mới", value: notifications.length, tone: "slate" },
      ]}
      primaryAction={
        session.role === "admin"
          ? {
              href: "/admin/classrooms/new",
              label: "Tạo lớp học mới",
              icon: "fa-plus",
            }
          : undefined
      }
      secondaryAction={{
        href: "/admin",
        label: "Về tổng quan",
        icon: "fa-house",
      }}
      sectionLinks={[
        { href: "#danh-sach", label: "Danh sách lớp" },
        { href: "#thong-bao", label: "Thông báo" },
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-[1.7fr,1fr]">
        <section id="danh-sach" className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Danh sách lớp</h2>
            <p className="text-sm text-slate-500">
              Tập trung vào thẻ lớp học. Các sự kiện như bài tập mới hay học sinh nộp bài sẽ đi qua thông báo.
            </p>
          </div>

          {classrooms.length === 0 ? (
            <div className="card rounded-[1.5rem] p-10 text-center text-slate-500">
              <i className="fa-solid fa-users-slash text-4xl text-slate-300"></i>
              <p className="mt-4">Chưa có lớp học nào.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {classrooms.map((classroom) => (
                <article key={classroom.id} className="card rounded-[1.5rem] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <span className="badge badge-primary font-mono">{classroom.code}</span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900">{classroom.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">Giáo viên: {classroom.teacher.name}</p>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span>{classroom.students.length} học sinh</span>
                    <span>{classroom._count.assignments} bài tập</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/admin/classrooms/${classroom.id}`} className="btn btn-secondary">
                      <i className="fa-solid fa-eye"></i> Chi tiết
                    </Link>
                    <Link href={`/admin/classrooms/${classroom.id}/edit`} className="btn btn-primary">
                      <i className="fa-solid fa-pen"></i> Sửa lớp
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {classrooms.length > 0 ? (
            <div className="card rounded-[1.5rem] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-slate-500">Tổng học sinh</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{totalStudents}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Tổng bài tập đã giao</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{totalAssignments}</div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <div id="thong-bao">
          <NotificationInbox
            emptyMessage="Chưa có thông báo mới liên quan tới lớp học."
            notifications={notifications}
          />
        </div>
      </div>
    </TeacherChrome>
  );
}
