import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireTeacher } from "@/lib/session";
import TeacherShell from "@/components/teacher/TeacherShell";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import AdminLessonsClientPage from "./AdminLessonsClientPage";

export default async function AdminLessonsPage() {
  const session = await requireTeacher();

  const chapters = await prisma.chapter.findMany({
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { exercises: true } },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

  return (
    <TeacherShell userName={session.name} role={session.role as "teacher" | "admin"}>
      <>
        <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <i className="fa-solid fa-chart-line text-xs"></i>
            Tổng quan
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="font-medium text-slate-700">Bài giảng</span>
        </nav>

        <TeacherPageFrame
          title="Quản lý Bài giảng"
          subtitle={`${chapters.length} chương · ${totalLessons} bài giảng đang quản lý`}
          primaryAction={{ href: "/admin/lessons/new", label: "Tạo bài giảng mới", icon: "fa-plus" }}
        >
          <AdminLessonsClientPage initialChapters={chapters} />
        </TeacherPageFrame>
      </>
    </TeacherShell>
  );
}
