import Link from "next/link";
import prisma from "@/lib/prisma";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import AdminChaptersClientPage from "./AdminChaptersClientPage";

export default async function AdminChaptersPage() {
  const chapters = await prisma.chapter.findMany({
    include: {
      _count: { select: { lessons: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
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
          <span className="font-medium text-slate-700">Chương học</span>
        </nav>

        <TeacherPageFrame
          title="Quản lý Chương học"
          subtitle={`${chapters.length} chương · Tổ chức lộ trình và cấu trúc nội dung bài học`}
        >
          <AdminChaptersClientPage initialChapters={chapters} />
        </TeacherPageFrame>
    </>
  );
}
