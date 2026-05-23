import { requireTeacher } from "@/lib/session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeacherShell from "@/components/teacher/TeacherShell";
import TeacherPageFrame from "@/components/teacher/TeacherPageFrame";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentProfilePage({ params }: PageProps) {
  const session = await requireTeacher();
  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      studentClassrooms: {
        include: {
          classroom: {
            select: { id: true, name: true, teacherId: true },
          },
        },
      },
    },
  });

  if (!student || student.role !== "student") {
    redirect("/admin/classrooms");
  }

  if (session.role !== "admin") {
    const canView = student.studentClassrooms.some(
      (item) => item.classroom.teacherId === session.userId
    );
    if (!canView) {
      redirect("/admin/classrooms");
    }
  }

  const classroomNames = student.studentClassrooms.map((sc) => sc.classroom.name).join(", ");

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
          <Link
            href="/admin/classrooms"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Lớp học
          </Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
          <span className="font-medium text-slate-700">{student.name}</span>
        </nav>

        <TeacherPageFrame
          title="Hồ sơ học sinh"
          subtitle={`${student.email}${classroomNames ? ` · ${classroomNames}` : ""}`}
        >
          <div className="card p-6 space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <div className="input bg-gray-50">{student.name}</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Độ tuổi</label>
                <div className="input bg-gray-50">{student.profile?.age ?? "Chưa cập nhật"}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                <div className="input bg-gray-50">{student.profile?.gender || "Chưa cập nhật"}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp / Khối</label>
                <div className="input bg-gray-50">{student.profile?.gradeLevel || "Chưa cập nhật"}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trường</label>
                <div className="input bg-gray-50">{student.profile?.school || "Chưa cập nhật"}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <div className="input bg-gray-50">{student.profile?.phone || "Chưa cập nhật"}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="input bg-gray-50">{student.email}</div>
            </div>

            {student.studentClassrooms.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lớp học tham gia</label>
                <div className="flex flex-wrap gap-2">
                  {student.studentClassrooms.map(({ classroom }) => (
                    <Link
                      key={classroom.id}
                      href={`/admin/classrooms/${classroom.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      <i className="fa-solid fa-users-rectangle text-xs"></i>
                      {classroom.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TeacherPageFrame>
      </>
    </TeacherShell>
  );
}
