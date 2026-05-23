import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import TeacherShell from "@/components/teacher/TeacherShell";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";
import AdminUsersClientPage from "./AdminUsersClientPage";

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  const studentCount = users.filter((u) => u.role === "student").length;
  const teacherCount = users.filter((u) => u.role === "teacher").length;

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
          <span className="font-medium text-slate-700">Người dùng</span>
        </nav>

        <TeacherPageFrame
          title="Quản lý Người dùng"
          subtitle={`${users.length} tài khoản · ${teacherCount} giáo viên · ${studentCount} học sinh`}
        >
          <AdminUsersClientPage
            initialUsers={users.map((user) => ({
              ...user,
              createdAt: user.createdAt.toISOString(),
            }))}
          />
        </TeacherPageFrame>
      </>
    </TeacherShell>
  );
}
